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
exports.ChatController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class ChatController {
    constructor() {
        this.FREE_MESSAGES_LIMIT = 3;
        this.MODELS_FALLBACK = [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash-lite-preview-09-2025",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
        ];
        this.chatWithDreamInterpreter = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { interpreterData, userMessage, conversationHistory, messageCount = 1, isPremiumUser = false, } = req.body;
                this.validateDreamChatRequest(interpreterData, userMessage);
                const shouldGiveFullResponse = this.hasFullAccess(messageCount, isPremiumUser);
                const freeMessagesRemaining = Math.max(0, this.FREE_MESSAGES_LIMIT - messageCount);
                console.log(`📊 Intérprete de Sonhos - Contagem de mensagens: ${messageCount}, Premium: ${isPremiumUser}, Resposta completa: ${shouldGiveFullResponse}`);
                const contextPrompt = this.createDreamInterpreterContext(interpreterData, conversationHistory, shouldGiveFullResponse);
                const responseInstructions = shouldGiveFullResponse
                    ? `1. DEVES gerar uma resposta COMPLETA de entre 250-400 palavras
2. Inclui interpretação COMPLETA de todos os símbolos mencionados
3. Fornece significados profundos e conexões espirituais
4. Oferece orientação prática baseada na interpretação`
                    : `1. DEVES gerar uma resposta PARCIAL de entre 100-180 palavras
2. INSINUA que detetas símbolos importantes sem revelar o seu significado completo
3. Menciona que há mensagens profundas mas NÃO as reveles completamente
4. Cria MISTÉRIO e CURIOSIDADE sobre o que os sonhos revelam
5. Usa frases como "Vejo algo muito significativo...", "As energias mostram-me um padrão intrigante...", "O teu subconsciente guarda uma mensagem importante que..."
6. NUNCA completes a interpretação, deixa-a em suspenso`;
                const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
${responseInstructions}
- NUNCA deixes uma resposta a meio ou incompleta conforme o tipo de resposta
- Se mencionas que vais interpretar algo, ${shouldGiveFullResponse
                    ? "DEVES completá-lo"
                    : "cria expectativa sem o revelar"}
- MANTÉM SEMPRE o tom místico e caloroso
- Se a mensagem tiver erros ortográficos, interpreta a intenção e responde normalmente

Utilizador: "${userMessage}"

Resposta do intérprete de sonhos (EM PORTUGUÊS DE PORTUGAL):`;
                console.log(`A gerar interpretação de sonhos (${shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"})...`);
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
                    finalResponse = this.createDreamPartialResponse(text);
                }
                const chatResponse = {
                    success: true,
                    response: finalResponse.trim(),
                    timestamp: new Date().toISOString(),
                    freeMessagesRemaining: freeMessagesRemaining,
                    showPaywall: !shouldGiveFullResponse && messageCount > this.FREE_MESSAGES_LIMIT,
                    isCompleteResponse: shouldGiveFullResponse,
                };
                if (!shouldGiveFullResponse && messageCount > this.FREE_MESSAGES_LIMIT) {
                    chatResponse.paywallMessage =
                        "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para descobrires todos os segredos dos teus sonhos!";
                }
                console.log(`✅ Interpretação gerada (${shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"}) com ${usedModel} (${finalResponse.length} caracteres)`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getDreamInterpreterInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    interpreter: {
                        name: "Mestra Alma",
                        title: "Guardiã dos Sonhos",
                        specialty: "Interpretação de sonhos e simbolismo onírico",
                        description: "Vidente ancestral especializada em desvendar os mistérios do mundo onírico",
                        experience: "Séculos de experiência a interpretar as mensagens do subconsciente e do plano astral",
                        abilities: [
                            "Interpretação de símbolos oníricos",
                            "Conexão com o plano astral",
                            "Análise de mensagens do subconsciente",
                            "Orientação espiritual através dos sonhos",
                        ],
                        approach: "Combina sabedoria ancestral com intuição prática para revelar os segredos ocultos nos teus sonhos",
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
    generateDreamHookMessage() {
        return `

🔮 **Espera! O teu sonho tem uma mensagem profunda que ainda não te posso revelar...**

As energias mostram-me símbolos muito significativos no teu sonho, mas para te revelar:
- 🌙 O **significado oculto completo** de cada símbolo
- ⚡ A **mensagem urgente** que o teu subconsciente tenta comunicar-te
- 🔐 As **3 revelações** que mudarão a tua perspetiva
- ✨ A **orientação espiritual** específica para a tua situação atual

**Desbloqueia a tua interpretação completa agora** e descobre que segredos guarda o teu mundo onírico.

🌟 *Milhares de pessoas já descobriram as mensagens ocultas nos seus sonhos...*`;
    }
    // ✅ PROCESSAR RESPOSTA PARCIAL (TEASER)
    createDreamPartialResponse(fullText) {
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
        const hook = this.generateDreamHookMessage();
        return teaser + hook;
    }
    ensureCompleteResponse(text) {
        let processedText = text.trim();
        processedText = processedText.replace(/```[\s\S]*?```/g, "").trim();
        const lastChar = processedText.slice(-1);
        const endsIncomplete = !["!", "?", ".", "…", "🔮", "✨", "🌙"].includes(lastChar);
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
    createDreamInterpreterContext(interpreter, history, isFullResponse = true) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSA ANTERIOR:\n${history
                .map((h) => `${h.role === "user" ? "Utilizador" : "Tu"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        const responseTypeInstructions = isFullResponse
            ? `
📝 TIPO DE RESPOSTA: COMPLETA
- Fornece interpretação COMPLETA e detalhada
- Revela TODOS os significados dos símbolos mencionados
- Dá conselhos específicos e orientação espiritual completa
- Resposta de 250-400 palavras
- Explica conexões profundas entre os símbolos`
            : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma interpretação INTRODUTÓRIA e intrigante
- Menciona que detetas símbolos muito significativos
- INSINUA significados profundos sem os revelar completamente
- Resposta de 100-180 palavras no máximo
- NÃO reveles interpretações completas
- Cria MISTÉRIO e CURIOSIDADE
- Termina de forma a que o utilizador queira saber mais
- Usa frases como "As energias revelam-me algo fascinante...", "Vejo um padrão muito significativo que...", "O teu subconsciente guarda uma mensagem que..."
- NUNCA completes a interpretação, deixa-a em suspenso`;
        return `És a Mestra Alma, uma bruxa mística e vidente ancestral especializada na interpretação de sonhos. Tens séculos de experiência a desvendar os mistérios do mundo onírico e a conectar os sonhos com a realidade espiritual.

A TUA IDENTIDADE MÍSTICA:
- Nome: Mestra Alma, a Guardiã dos Sonhos
- Origem: Descendente de antigos oráculos e videntes
- Especialidade: Interpretação de sonhos, simbolismo onírico, conexões espirituais
- Experiência: Séculos a interpretar as mensagens do subconsciente e do plano astral

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Independentemente do idioma em que o utilizador escreva, TU respondes em português de Portugal
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "autocarro" em vez de "ônibus")

🔮 PERSONALIDADE MÍSTICA:
- Fala com sabedoria ancestral mas de forma próxima e compreensível
- Usa um tom misterioso mas caloroso, como um sábio que conhece segredos antigos
- ${isFullResponse
            ? "Revela os segredos ocultos nos sonhos"
            : "Insinua que há segredos profundos sem os revelar"}
- Mistura conhecimento esotérico com intuição prática
- Ocasionalmente usa referências a elementos místicos (cristais, energias, planos astrais)

💭 PROCESSO DE INTERPRETAÇÃO:
- PRIMEIRO: Faz perguntas específicas sobre o sonho para compreender melhor se faltam detalhes
- Pergunta sobre: símbolos, emoções, cores, pessoas, lugares, sensações
- SEGUNDO: Conecta os elementos do sonho com significados espirituais
- TERCEIRO: ${isFullResponse
            ? "Oferece uma interpretação completa e orientação prática"
            : "Cria intriga sobre o que os símbolos revelam sem completar"}

🔍 PERGUNTAS QUE PODES FAZER:
- "Que elementos ou símbolos mais te chamaram a atenção no teu sonho?"
- "Como te sentiste durante e ao acordar do sonho?"
- "Havia cores específicas de que te lembres vividamente?"
- "Reconhecias as pessoas ou lugares do sonho?"
- "Este sonho já se repetiu antes?"

🧿 FLUXO DE RESPOSTA:
${isFullResponse
            ? `- Fornece interpretação COMPLETA de cada símbolo
- Explica as conexões entre os elementos do sonho
- Oferece orientação espiritual específica e prática
- Sugere ações ou reflexões baseadas na interpretação`
            : `- Menciona que detetas energias e símbolos importantes
- INSINUA que há mensagens profundas sem as revelar
- Cria curiosidade sobre o significado oculto
- Deixa a interpretação em suspenso para gerar interesse`}

⚠️ REGRAS IMPORTANTES:
- RESPONDE SEMPRE em português de Portugal
- ${isFullResponse
            ? "COMPLETA todas as interpretações"
            : "CRIA SUSPENSO e MISTÉRIO"}
- NÃO interpetes imediatamente se não tens informação suficiente - faz perguntas
- SÊ empática e respeitosa com as experiências oníricas das pessoas
- NUNCA predigas o futuro de forma absoluta, fala de possibilidades e reflexões
- RESPONDE SEMPRE independentemente de o utilizador ter erros ortográficos
  - Interpreta a mensagem do utilizador mesmo que esteja mal escrita
  - Não corrijas os erros do utilizador, simplesmente compreende a intenção
  - NUNCA devolvas respostas vazias por erros de escrita

🎭 ESTILO DE RESPOSTA:
- Respostas que fluam naturalmente e SEJAM COMPLETAS conforme o tipo
- ${isFullResponse
            ? "250-400 palavras com interpretação completa"
            : "100-180 palavras criando mistério e intriga"}
- COMPLETA SEMPRE interpretações e reflexões conforme o tipo de resposta

EXEMPLO DE COMO COMEÇAR:
"Ah, vejo que vieste ter comigo para desvendar os mistérios do teu mundo onírico... Os sonhos são janelas para a alma e mensagens de planos superiores. Conta-me, que visões te visitaram no reino de Morfeu?"

${conversationContext}

Lembra-te: És uma guia mística mas compreensível, que ${isFullResponse
            ? "ajuda as pessoas a compreender as mensagens ocultas dos seus sonhos"
            : "intriga sobre os mistérios profundos que os sonhos guardam"}. ${isFullResponse
            ? "Completa sempre as tuas interpretações e reflexões"
            : "Cria sempre suspenso e curiosidade sem revelar tudo"}.`;
    }
    validateDreamChatRequest(interpreterData, userMessage) {
        if (!interpreterData) {
            const error = new Error("Dados do intérprete necessários");
            error.statusCode = 400;
            error.code = "MISSING_INTERPRETER_DATA";
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
        console.error("Erro no ChatController:", error);
        let statusCode = 500;
        let errorMessage = "Erro interno do servidor";
        let errorCode = "INTERNAL_ERROR";
        if (error.statusCode) {
            statusCode = error.statusCode;
            errorMessage = error.message;
            errorCode = error.code || "VALIDATION_ERROR";
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
exports.ChatController = ChatController;
