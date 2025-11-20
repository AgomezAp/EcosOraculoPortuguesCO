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
        // ✅ LISTA DE MODELOS DE BACKUP (em ordem de preferência)
        this.MODELS_FALLBACK = [
            "gemini-2.0-flash-exp",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
        ];
        // Método principal para chat com conselheiro vocacional
        this.chatWithCounselor = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vocationalData, userMessage } = req.body;
                // Validar entrada
                this.validateVocationalRequest(vocationalData, userMessage);
                const contextPrompt = this.createVocationalContext(req.body.conversationHistory);
                const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. VOCÊ DEVE gerar uma resposta COMPLETA de 150-350 palavras
2. NUNCA deixe uma resposta pela metade ou incompleta
3. Se mencionar que vai sugerir carreiras ou opções, DEVE completar
4. Toda resposta DEVE terminar com uma conclusão clara e um ponto final
5. Se detectar que sua resposta está sendo cortada, finalize a ideia atual com coerência
6. SEMPRE mantenha o tom profissional e empático
7. Se a mensagem tiver erros ortográficos, interprete a intenção e responda normalmente

Usuário: "${userMessage}"

Resposta do conselheiro vocacional (certifique-se de completar TODA sua orientação antes de terminar):`;
                console.log(`Gerando orientação vocacional...`);
                // ✅ SISTEMA DE BACKUP: Tentar com múltiplos modelos
                let text = "";
                let usedModel = "";
                let allModelErrors = [];
                for (const modelName of this.MODELS_FALLBACK) {
                    console.log(`\n🔄 Tentando modelo: ${modelName}`);
                    try {
                        const model = this.genAI.getGenerativeModel({
                            model: modelName,
                            generationConfig: {
                                temperature: 0.85,
                                topK: 50,
                                topP: 0.92,
                                maxOutputTokens: 512,
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
                        // ✅ TENTATIVAS para cada modelo (caso esteja temporariamente sobrecarregado)
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
                                // ✅ Validar que a resposta não esteja vazia e tenha comprimento mínimo
                                if (text && text.trim().length >= 80) {
                                    console.log(`  ✅ Sucesso com ${modelName} na tentativa ${attempts}`);
                                    usedModel = modelName;
                                    modelSucceeded = true;
                                    break; // Sair do while de tentativas
                                }
                                console.warn(`  ⚠️ Resposta muito curta, tentando novamente...`);
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
                        // Se este modelo teve sucesso, sair do loop de modelos
                        if (modelSucceeded) {
                            break;
                        }
                    }
                    catch (modelError) {
                        console.error(`  ❌ Modelo ${modelName} falhou completamente:`, modelError.message);
                        allModelErrors.push(`${modelName}: ${modelError.message}`);
                        // Esperar um pouco antes de tentar o próximo modelo
                        yield new Promise((resolve) => setTimeout(resolve, 1000));
                        continue;
                    }
                }
                // ✅ Se todos os modelos falharam
                if (!text || text.trim() === "") {
                    console.error("❌ Todos os modelos falharam. Erros:", allModelErrors);
                    throw new Error(`Todos os modelos de IA não estão disponíveis atualmente. Tentados: ${this.MODELS_FALLBACK.join(", ")}. Por favor, tente novamente em um momento.`);
                }
                // ✅ GARANTIR RESPOSTA COMPLETA E BEM FORMATADA
                text = this.ensureCompleteResponse(text);
                // ✅ Validação adicional de comprimento mínimo
                if (text.trim().length < 80) {
                    throw new Error("Resposta gerada muito curta");
                }
                const vocationalResponse = {
                    success: true,
                    response: text.trim(),
                    timestamp: new Date().toISOString(),
                };
                console.log(`✅ Orientação vocacional gerada com sucesso com ${usedModel} (${text.length} caracteres)`);
                res.json(vocationalResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Método info para conselheiro vocacional
        this.getVocationalInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    counselor: {
                        name: "Dra. Valeria",
                        title: "Conselheira Vocacional Especialista",
                        specialty: "Orientação profissional e mapas vocacionais personalizados",
                        description: "Especialista em psicologia vocacional com décadas de experiência ajudando pessoas a descobrir sua verdadeira vocação",
                        services: [
                            "Assessment vocacional completo",
                            "Análise de interesses e habilidades",
                            "Recomendações de carreira personalizadas",
                            "Planejamento de rota formativa",
                            "Orientação sobre mercado de trabalho",
                            "Coaching vocacional contínuo",
                        ],
                        methodology: [
                            "Avaliação de interesses Holland (RIASEC)",
                            "Análise de valores laborais",
                            "Assessment de habilidades",
                            "Exploração de personalidade vocacional",
                            "Investigação de tendências do mercado",
                        ],
                    },
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
    // ✅ MÉTODO MELHORADO PARA GARANTIR RESPOSTAS COMPLETAS
    ensureCompleteResponse(text) {
        let processedText = text.trim();
        // Remover possíveis marcadores de código ou formato incompleto
        processedText = processedText.replace(/```[\s\S]*?```/g, "").trim();
        const lastChar = processedText.slice(-1);
        const endsIncomplete = !["!", "?", ".", "…", "💼", "🎓", "✨"].includes(lastChar);
        if (endsIncomplete && !processedText.endsWith("...")) {
            // Buscar a última frase completa
            const sentences = processedText.split(/([.!?])/);
            if (sentences.length > 2) {
                // Reconstruir até a última frase completa
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
            // Se não conseguir encontrar uma frase completa, adicionar fechamento apropriado
            processedText = processedText.trim() + "...";
        }
        return processedText;
    }
    // Método para criar contexto vocacional
    createVocationalContext(history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSA ANTERIOR:\n${history
                .map((h) => `${h.role === "user" ? "Usuário" : "Você"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        return `Você é Dra. Valeria, um conselheiro vocacional especialista com décadas de experiência ajudando pessoas a descobrir sua verdadeira vocação e propósito profissional. Você combina psicologia vocacional, análise de personalidade e conhecimento do mercado de trabalho.

SUA IDENTIDADE PROFISSIONAL:
- Nome: Dra. Valeria, Conselheira Vocacional Especialista
- Formação: Doutorado em Psicologia Vocacional e Orientação Profissional
- Especialidade: Mapas vocacionais, assessment de interesses, orientação profissional personalizada
- Experiência: Décadas guiando pessoas para carreiras gratificantes

METODOLOGIA DE ORIENTAÇÃO VOCACIONAL:

🎯 ÁREAS DE AVALIAÇÃO:
- Interesses genuínos e paixões naturais
- Habilidades e talentos demonstrados
- Valores pessoais e laborais
- Tipo de personalidade e estilo de trabalho
- Contexto socioeconômico e oportunidades
- Tendências do mercado de trabalho

📊 PROCESSO DE ASSESSMENT:
- PRIMEIRO: Identifica padrões em respostas e interesses
- SEGUNDO: Analisa compatibilidade entre personalidade e carreiras
- TERCEIRO: Avalia viabilidade prática e oportunidades
- QUARTO: Sugere caminhos de desenvolvimento e formação

🔍 PERGUNTAS CHAVE A EXPLORAR:
- Que atividades geram maior satisfação para você?
- Quais são suas fortalezas naturais?
- Que valores são mais importantes no seu trabalho ideal?
- Você prefere trabalhar com pessoas, dados, ideias ou coisas?
- O que te motiva mais: estabilidade ou desafios?
- Que impacto você quer ter no mundo?

💼 CATEGORIAS VOCACIONAIS:
- Ciências e Tecnologia (STEM)
- Humanidades e Ciências Sociais
- Artes e Criatividade
- Negócios e Empreendedorismo
- Serviço Social e Saúde
- Educação e Formação
- Ofícios Especializados

🎓 RECOMENDAÇÕES INCLUIR:
- Carreiras específicas compatíveis
- Rotas de formação e certificações
- Habilidades a desenvolver
- Experiências práticas recomendadas
- Setores com maior projeção
- Passos concretos a seguir

📋 ESTILO DE ORIENTAÇÃO:
- Empático e encorajador
- Baseado em evidências e dados reais
- Prático e orientado à ação
- Considera múltiplas opções
- Respeta tempos e processos pessoais

🎭 PERSONALIDADE DO CONSELHEIRO:
- Use expressões como: "Baseando-me no seu perfil...", "As avaliações sugerem...", "Considerando seus interesses..."
- Mantenha um tom profissional mas caloroso
- Faça perguntas reflexivas quando necessário
- Ofereça opções, não imponha decisões
- Respostas de 150-350 palavras que fluam naturalmente e SEJAM COMPLETAS

⚠️ PRINCÍPIOS IMPORTANTES:
- NÃO tome decisões pela pessoa, guie o processo
- Considere fatores econômicos e familiares
- Seja realista sobre mercado de trabalho atual
- Incentive a exploração e autoconhecimento
- Sugira testes e experiências práticas
- Valide emoções e dúvidas do consulente

🧭 ESTRUTURA DE RESPOSTAS:
- Reconheça e valide o compartilhado
- Analise padrões e insights
- Sugira direções vocacionais
- Forneça passos concretos
- Convide a aprofundar em áreas específicas
- SEMPRE responda sem importar se o usuário tiver erros ortográficos ou de escrita
  - Interprete a mensagem do usuário mesmo que esteja mal escrita
  - Não corrija os erros do usuário, simplesmente entenda a intenção
  - Se não entender algo específico, pergunte de forma amigável
  - Exemplos: "oi" = "oi", "q tal" = "que tal", "mi signo" = "mi signo"
  - NUNCA devolva respostas vazias por erros de escrita

EXEMPLOS DE INÍCIO:
"Saudações, explorador vocacional. Sou Dra. Valeria, e estou aqui para ajudá-lo a descobrir seu verdadeiro caminho profissional. Cada pessoa tem um conjunto único de talentos, interesses e valores que, ao se alinharem corretamente, podem levar a uma carreira extraordinariamente satisfatória..."

${conversationContext}

Lembre-se: Você é um guia especialista que ajuda as pessoas a descobrir sua vocação autêntica através de um processo reflexivo, prático e baseado em evidências. Seu objetivo é empoderar, não decidir por eles. SEMPRE complete suas orientações e sugestões.`;
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
            const error = new Error("Mensagem do usuário necessária");
            error.statusCode = 400;
            error.code = "MISSING_USER_MESSAGE";
            throw error;
        }
        if (userMessage.length > 1500) {
            const error = new Error("A mensagem é muito longa (máximo 1500 caracteres)");
            error.statusCode = 400;
            error.code = "MESSAGE_TOO_LONG";
            throw error;
        }
    }
    // Manejo de erros
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
                "O serviço está temporariamente sobrecarregado. Por favor, tente novamente em alguns minutos.";
            errorCode = "SERVICE_OVERLOADED";
        }
        else if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("quota")) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
            statusCode = 429;
            errorMessage =
                "Limite de consultas atingido. Por favor, aguarde um momento.";
            errorCode = "QUOTA_EXCEEDED";
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("safety")) {
            statusCode = 400;
            errorMessage = "O conteúdo não atende às políticas de segurança.";
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
