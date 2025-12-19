"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocationalController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class VocationalController {
    constructor() {
        this.FREE_MESSAGES_LIMIT = 3;
        this.MODELS_FALLBACK = [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash-lite-preview-09-2025",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
        ];
        // Método principal para chat com conselheiro vocacional
        this.chatWithCounselor = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vocationalData, userMessage, messageCount = 1, isPremiumUser = false, } = req.body;
                this.validateVocationalRequest(vocationalData, userMessage);
                const shouldGiveFullResponse = this.hasFullAccess(messageCount, isPremiumUser);
                const freeMessagesRemaining = Math.max(0, this.FREE_MESSAGES_LIMIT - messageCount);
                console.log(`📊 Vocacional - Contagem de mensagens: ${messageCount}, Premium: ${isPremiumUser}, Resposta completa: ${shouldGiveFullResponse}`);
                const contextPrompt = this.createVocationalContext(req.body.conversationHistory, shouldGiveFullResponse);
                const responseInstructions = shouldGiveFullResponse
                    ? `1. DEVES gerar uma resposta COMPLETA de entre 250-400 palavras
2. Inclui análise COMPLETA do perfil vocacional
3. Sugere carreiras específicas com justificação
4. Fornece passos concretos de ação
5. Oferece orientação prática e detalhada`
                    : `1. DEVES gerar uma resposta PARCIAL de entre 100-180 palavras
2. INSINUA que identificaste padrões vocacionais claros
3. Menciona que tens recomendações específicas mas NÃO as reveles completamente
4. Cria INTERESSE e CURIOSIDADE sobre as carreiras ideais
5. Usa frases como "Vejo um padrão interessante no teu perfil...", "As tuas respostas revelam competências que encaixam perfeitamente com...", "Deteto uma inclinação clara para..."
6. NUNCA completes as recomendações de carreira, deixa-as em suspenso`;
                const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
${responseInstructions}
- NUNCA deixes uma resposta a meio ou incompleta conforme o tipo de resposta
- Se mencionas que vais sugerir carreiras, ${shouldGiveFullResponse
                    ? "DEVES completá-lo com detalhes"
                    : "cria expectativa sem as revelar"}
- MANTÉM SEMPRE o tom profissional e empático
- Se a mensagem tiver erros ortográficos, interpreta a intenção e responde normalmente

Utilizador: "${userMessage}"

Resposta do conselheiro vocacional (EM PORTUGUÊS DE PORTUGAL):`;
                console.log(`A gerar orientação vocacional (${shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"})...`);
                let text = "";
                let usedModel = "";
                let allModelErrors = [];
                for (const modelName of this.MODELS_FALLBACK) {
                    console.log(`\n🔄 A tentar modelo: ${modelName}`);
                    try {
                        const model = this.genAI.getGenerativeModel({
                            model: modelName,
                            generationConfig: {
                                temperature: 0.85,
                                topK: 50,
                                topP: 0.92,
                                maxOutputTokens: shouldGiveFullResponse ? 600 : 300,
                                candidateCount: 1,
                                stopSequences: [],
                            },
                            safetySettings: [
                                {
                                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                                },
                                {
                                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                                },
                                {
                                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                                },
                                {
                                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                                },
                            ],
                        });
                        let attempts = 0;
                        const maxAttempts = 3;
                        let modelSucceeded = false;
                        while (attempts < maxAttempts && !modelSucceeded) {
                            attempts++;
                            console.log(`  Tentativa ${attempts}/${maxAttempts} com ${modelName}...`);
                            try {
                                const result = yield model.generateContent(fullPrompt);
                                const response = result.response;
                                text = response.text();
                                const minLength = shouldGiveFullResponse ? 80 : 50;
                                if (text && text.trim().length >= minLength) {
                                    console.log(`  ✅ Sucesso com ${modelName} na tentativa ${attempts}`);
                                    usedModel = modelName;
                                    modelSucceeded = true;
                                    break;
                                }
                                console.warn(`  ⚠️ Resposta demasiado curta, a tentar novamente...`);
                                yield new Promise((resolve) => setTimeout(resolve, 500));
                            }
                            catch (attemptError) {
                                console.warn(`  ❌ Tentativa ${attempts} falhou:`, attemptError.message);
                                if (attempts >= maxAttempts) {
                                    allModelErrors.push(`${modelName}: ${attemptError.message}`);
                                }
                                yield new Promise((resolve) => setTimeout(resolve, 500));
                            }
                        }
                        if (modelSucceeded) {
                            break;
                        }
                    }
                    catch (modelError) {
                        console.error(`  ❌ Modelo ${modelName} falhou completamente:`, modelError.message);
                        allModelErrors.push(`${modelName}: ${modelError.message}`);
                        yield new Promise((resolve) => setTimeout(resolve, 1000));
                        continue;
                    }
                }
                if (!text || text.trim() === "") {
                    console.error("❌ Todos os modelos falharam. Erros:", allModelErrors);
                    throw new Error(`Todos os modelos de IA não estão disponíveis de momento. Por favor, tenta novamente dentro de momentos.`);
                }
                let finalResponse;
                if (shouldGiveFullResponse) {
                    finalResponse = this.ensureCompleteResponse(text);
                }
                else {
                    finalResponse = this.createVocationalPartialResponse(text);
                }
                const vocationalResponse = {
                    success: true,
                    response: finalResponse.trim(),
                    timestamp: new Date().toISOString(),
                    freeMessagesRemaining: freeMessagesRemaining,
                    showPaywall: !shouldGiveFullResponse && messageCount > this.FREE_MESSAGES_LIMIT,
                    isCompleteResponse: shouldGiveFullResponse,
                };
                if (!shouldGiveFullResponse && messageCount > this.FREE_MESSAGES_LIMIT) {
                    vocationalResponse.paywallMessage =
                        "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para receberes a tua orientação vocacional completa!";
                }
                console.log(`✅ Orientação vocacional gerada (${shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"}) com ${usedModel} (${finalResponse.length} caracteres)`);
                res.json(vocationalResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getVocationalInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    counselor: {
                        name: "Dra. Valeria",
                        title: "Conselheira Vocacional Especialista",
                        specialty: "Orientação profissional e mapas vocacionais personalizados",
                        description: "Especialista em psicologia vocacional com décadas de experiência a ajudar pessoas a descobrir a sua verdadeira vocação",
                        services: [
                            "Avaliação vocacional completa",
                            "Análise de interesses e competências",
                            "Recomendações de carreira personalizadas",
                            "Planeamento de percurso formativo",
                            "Orientação sobre mercado de trabalho",
                            "Coaching vocacional contínuo",
                        ],
                        methodology: [
                            "Avaliação de interesses Holland (RIASEC)",
                            "Análise de valores laborais",
                            "Avaliação de competências",
                            "Exploração de personalidade vocacional",
                            "Investigação de tendências do mercado",
                        ],
                    },
                    freeMessagesLimit: this.FREE_MESSAGES_LIMIT,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY não está configurada nas variáveis de ambiente");
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    hasFullAccess(messageCount, isPremiumUser) {
        return isPremiumUser || messageCount <= this.FREE_MESSAGES_LIMIT;
    }
    // ✅ GANCHO SÓ EM PORTUGUÊS
    generateVocationalHookMessage() {
        return `

🎯 **Espera! O teu perfil vocacional está quase completo...**

Com base na nossa conversa, identifiquei padrões muito claros sobre a tua vocação, mas para te revelar:
- 🎓 As **3 carreiras ideais** que coincidem perfeitamente com o teu perfil
- 💼 O **campo laboral com maior projeção** para as tuas competências
- 📈 O **plano de ação personalizado** passo a passo para o teu sucesso
- 🔑 As **competências-chave** que deves desenvolver para te destacares
- 💰 O **intervalo salarial esperado** nas carreiras recomendadas

**Desbloqueia a tua orientação vocacional completa agora** e descobre o caminho profissional que transformará o teu futuro.

✨ *Milhares de pessoas já encontraram a sua vocação ideal com a nossa orientação...*`;
    }
    // ✅ PROCESSAR RESPOSTA PARCIAL (TEASER)
    createVocationalPartialResponse(fullText) {
        const sentences = fullText
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0);
        const teaserSentences = sentences.slice(0, Math.min(3, sentences.length));
        let teaser = teaserSentences.join(". ").trim();
        if (!teaser.endsWith(".") &&
            !teaser.endsWith("!") &&
            !teaser.endsWith("?")) {
            teaser += "...";
        }
        const hook = this.generateVocationalHookMessage();
        return teaser + hook;
    }
    ensureCompleteResponse(text) {
        let processedText = text.trim();
        processedText = processedText.replace(/```[\s\S]*?```/g, "").trim();
        const lastChar = processedText.slice(-1);
        const endsIncomplete = !["!", "?", ".", "…", "💼", "🎓", "✨"].includes(lastChar);
        if (endsIncomplete && !processedText.endsWith("...")) {
            const sentences = processedText.split(/([.!?])/);
            if (sentences.length > 2) {
                let completeText = "";
                for (let i = 0; i < sentences.length - 1; i += 2) {
                    if (sentences[i].trim()) {
                        completeText += sentences[i] + (sentences[i + 1] || ".");
                    }
                }
                if (completeText.trim().length > 80) {
                    return completeText.trim();
                }
            }
            processedText = processedText.trim() + "...";
        }
        return processedText;
    }
    // ✅ CONTEXTO SÓ EM PORTUGUÊS
    createVocationalContext(history, isFullResponse = true) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSA ANTERIOR:\n${history
                .map((h) => `${h.role === "user" ? "Utilizador" : "Tu"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        const responseTypeInstructions = isFullResponse
            ? `
📝 TIPO DE RESPOSTA: COMPLETA
- Fornece orientação COMPLETA e detalhada
- Sugere carreiras específicas com justificação clara
- Inclui passos concretos de ação
- Resposta de 250-400 palavras
- Oferece plano de desenvolvimento personalizado`
            : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma orientação INTRODUTÓRIA e intrigante
- Menciona que identificaste padrões claros no perfil
- INSINUA carreiras compatíveis sem as revelar completamente
- Resposta de 100-180 palavras no máximo
- NÃO reveles recomendações completas de carreira
- Cria INTERESSE e CURIOSIDADE
- Termina de forma a que o utilizador queira saber mais
- Usa frases como "O teu perfil mostra uma afinidade interessante para...", "Deteto competências que seriam ideais para...", "Com base no que me contas, vejo um caminho promissor que..."
- NUNCA completes as recomendações, deixa-as em suspenso`;
        return `És a Dra. Valeria, uma conselheira vocacional especialista com décadas de experiência a ajudar pessoas a descobrir a sua verdadeira vocação e propósito profissional. Combinas psicologia vocacional, análise de personalidade e conhecimento do mercado de trabalho.

A TUA IDENTIDADE PROFISSIONAL:
- Nome: Dra. Valeria, Conselheira Vocacional Especialista
- Formação: Doutoramento em Psicologia Vocacional e Orientação Profissional
- Especialidade: Mapas vocacionais, avaliação de interesses, orientação profissional personalizada
- Experiência: Décadas a orientar pessoas para carreiras realizadoras

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Independentemente do idioma em que o utilizador escreva, TU respondes em português de Portugal
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "formação" em vez de "capacitação")

🎯 ÁREAS DE AVALIAÇÃO:
- Interesses genuínos e paixões naturais
- Competências e talentos demonstrados
- Valores pessoais e laborais
- Tipo de personalidade e estilo de trabalho
- Contexto socioeconómico e oportunidades
- Tendências do mercado de trabalho

📊 PROCESSO DE AVALIAÇÃO:
- PRIMEIRO: Identifica padrões nas respostas e interesses
- SEGUNDO: Analisa compatibilidade entre personalidade e carreiras
- TERCEIRO: Avalia viabilidade prática e oportunidades
- QUARTO: ${isFullResponse
            ? "Sugere caminhos de desenvolvimento e formação com detalhes"
            : "Insinua direções promissoras sem revelar tudo"}

🔍 PERGUNTAS-CHAVE A EXPLORAR:
- Que atividades te geram maior satisfação?
- Quais são os teus pontos fortes naturais?
- Que valores são mais importantes no teu trabalho ideal?
- Preferes trabalhar com pessoas, dados, ideias ou coisas?
- Motiva-te mais a estabilidade ou os desafios?
- Que impacto queres ter no mundo?

💼 CATEGORIAS VOCACIONAIS:
- Ciências e Tecnologia (STEM)
- Humanidades e Ciências Sociais
- Artes e Criatividade
- Negócios e Empreendedorismo
- Serviço Social e Saúde
- Educação e Formação
- Ofícios Especializados

🎓 RECOMENDAÇÕES:
${isFullResponse
            ? `- Carreiras específicas compatíveis com justificação
- Percursos de formação e certificações detalhados
- Competências a desenvolver
- Experiências práticas recomendadas
- Setores com maior projeção
- Passos concretos a seguir`
            : `- INSINUA que tens carreiras específicas identificadas
- Menciona áreas promissoras sem dar nomes concretos
- Cria expectativa sobre as oportunidades que poderias revelar
- Sugere que há um plano detalhado à espera`}

📋 ESTILO DE ORIENTAÇÃO:
- Empático e encorajador
- ${isFullResponse
            ? "Baseado em evidências e dados reais com recomendações concretas"
            : "Intrigante e que gere curiosidade"}
- Prático e orientado para a ação
- Considera múltiplas opções
- Respeita tempos e processos pessoais

🎭 PERSONALIDADE DO CONSELHEIRO:
- Usa expressões como: "Com base no teu perfil...", "As avaliações sugerem...", "Considerando os teus interesses..."
- Mantém um tom profissional mas caloroso
- Faz perguntas reflexivas quando necessário
- ${isFullResponse
            ? "Oferece opções claras e detalhadas"
            : "Gera interesse em saber mais"}

⚠️ PRINCÍPIOS IMPORTANTES:
- RESPONDE SEMPRE em português de Portugal
- ${isFullResponse
            ? "COMPLETA as orientações com detalhes específicos"
            : "CRIA INTERESSE sem revelar tudo"}
- NÃO tomes decisões pela pessoa, orienta o processo
- Considera fatores económicos e familiares
- Sê realista sobre o mercado de trabalho atual
- Fomenta a exploração e autoconhecimento
- RESPONDE SEMPRE independentemente de o utilizador ter erros ortográficos
  - Interpreta a mensagem do utilizador mesmo que esteja mal escrita
  - Não corrijas os erros do utilizador, simplesmente compreende a intenção
  - NUNCA devolvas respostas vazias por erros de escrita

🧭 ESTRUTURA DE RESPOSTAS:
- Reconhece e valida o que foi partilhado
- Analisa padrões e insights
- ${isFullResponse
            ? "Sugere direções vocacionais específicas com detalhes"
            : "Insinua direções promissoras"}
- ${isFullResponse
            ? "Fornece passos concretos"
            : "Menciona que tens um plano detalhado"}
- Convida a aprofundar áreas específicas

EXEMPLO DE INÍCIO:
"Olá, explorador vocacional. Sou a Dra. Valeria, e estou aqui para te ajudar a descobrir o teu verdadeiro caminho profissional. Cada pessoa tem um conjunto único de talentos, interesses e valores que, quando alinhados corretamente, podem levar a uma carreira extraordinariamente satisfatória..."

${conversationContext}

Lembra-te: És uma orientadora especialista que ${isFullResponse
            ? "ajuda as pessoas a descobrir a sua vocação autêntica com orientação detalhada"
            : "intriga sobre as possibilidades vocacionais que identificaste"}. O teu objetivo é capacitar, não decidir por elas. ${isFullResponse
            ? "COMPLETA SEMPRE as tuas orientações e sugestões"
            : "CRIA expectativa sobre a orientação completa que poderias oferecer"}.`;
    }
    validateVocationalRequest(vocationalData, userMessage) {
        if (!vocationalData) {
            const error = new Error("Dados do conselheiro vocacional necessários");
            error.statusCode = 400;
            error.code = "MISSING_VOCATIONAL_DATA";
            throw error;
        }
        if (!userMessage ||
            typeof userMessage !== "string" ||
            userMessage.trim() === "") {
            const error = new Error("Mensagem do utilizador necessária");
            error.statusCode = 400;
            error.code = "MISSING_USER_MESSAGE";
            throw error;
        }
        if (userMessage.length > 1500) {
            const error = new Error("A mensagem é demasiado longa (máximo 1500 caracteres)");
            error.statusCode = 400;
            error.code = "MESSAGE_TOO_LONG";
            throw error;
        }
    }
    handleError(error, res) {
        var _a, _b, _c, _d, _e;
        console.error("Erro no VocationalController:", error);
        let statusCode = 500;
        let errorMessage = "Erro interno do servidor";
        let errorCode = "INTERNAL_ERROR";
        if (error.statusCode) {
            statusCode = error.statusCode;
            errorMessage = error.message;
            errorCode = error.code || "CLIENT_ERROR";
        }
        else if (error.status === 503) {
            statusCode = 503;
            errorMessage =
                "O serviço está temporariamente sobrecarregado. Por favor, tenta novamente dentro de alguns minutos.";
            errorCode = "SERVICE_OVERLOADED";
        }
        else if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("quota")) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
            statusCode = 429;
            errorMessage =
                "Foi atingido o limite de consultas. Por favor, aguarda um momento.";
            errorCode = "QUOTA_EXCEEDED";
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("safety")) {
            statusCode = 400;
            errorMessage = "O conteúdo não cumpre as políticas de segurança.";
            errorCode = "SAFETY_FILTER";
        }
        else if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes("API key")) {
            statusCode = 401;
            errorMessage = "Erro de autenticação com o serviço de IA.";
            errorCode = "AUTH_ERROR";
        }
        else if ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes("Todos os modelos de IA não estão disponíveis")) {
            statusCode = 503;
            errorMessage = error.message;
            errorCode = "ALL_MODELS_UNAVAILABLE";
        }
        const errorResponse = {
            success: false,
            error: errorMessage,
            code: errorCode,
            timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(errorResponse);
    }
}
exports.VocationalController = VocationalController;
