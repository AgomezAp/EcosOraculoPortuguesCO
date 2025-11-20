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
exports.ZodiacController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class ZodiacController {
    constructor() {
        // ✅ LISTA DE MODELOS DE RESPALDO (em ordem de preferência)
        this.MODELS_FALLBACK = [
            "gemini-2.0-flash-exp",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
        ];
        this.chatWithAstrologer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { zodiacData, userMessage, birthDate, zodiacSign, conversationHistory, } = req.body;
                // Validar entrada
                this.validateZodiacRequest(zodiacData, userMessage);
                const contextPrompt = this.createZodiacContext(zodiacData, birthDate, zodiacSign, conversationHistory);
                const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. DEVE gerar uma resposta COMPLETA entre 200-500 palavras
2. NUNCA deixe uma resposta pela metade ou incompleta
3. Se mencionar características do signo, DEVE completar a descrição
4. Toda resposta DEVE terminar com uma conclusão clara e um ponto final
5. Se detectar que sua resposta está sendo cortada, finalize a ideia atual com coerência
6. SEMPRE mantenha o tom astrológico amigável e acessível
7. Se a mensagem tiver erros ortográficos, interprete a intenção e responda normalmente

Usuário: "${userMessage}"

Resposta da astróloga (certifique-se de completar TODO sua análise zodiacal antes de terminar):`;
                console.log(`Gerando leitura zodiacal...`);
                // ✅ SISTEMA DE FALLBACK: Tentar com múltiplos modelos
                let text = "";
                let usedModel = "";
                let allModelErrors = [];
                for (const modelName of this.MODELS_FALLBACK) {
                    console.log(`\n🔄 Trying model: ${modelName}`);
                    try {
                        const model = this.genAI.getGenerativeModel({
                            model: modelName,
                            generationConfig: {
                                temperature: 0.85,
                                topK: 50,
                                topP: 0.92,
                                maxOutputTokens: 600,
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
                            console.log(`  Attempt ${attempts}/${maxAttempts} with ${modelName}...`);
                            try {
                                const result = yield model.generateContent(fullPrompt);
                                const response = result.response;
                                text = response.text();
                                // ✅ Validar que a resposta não esteja vazia e tenha comprimento mínimo
                                if (text && text.trim().length >= 100) {
                                    console.log(`  ✅ Success with ${modelName} on attempt ${attempts}`);
                                    usedModel = modelName;
                                    modelSucceeded = true;
                                    break; // Sair do while de tentativas
                                }
                                console.warn(`  ⚠️ Response too short, retrying...`);
                                yield new Promise((resolve) => setTimeout(resolve, 500));
                            }
                            catch (attemptError) {
                                console.warn(`  ❌ Attempt ${attempts} failed:`, attemptError.message);
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
                        console.error(`  ❌ Model ${modelName} failed completely:`, modelError.message);
                        allModelErrors.push(`${modelName}: ${modelError.message}`);
                        // Esperar um pouco antes de tentar com o próximo modelo
                        yield new Promise((resolve) => setTimeout(resolve, 1000));
                        continue;
                    }
                }
                // ✅ Se todos os modelos falharam
                if (!text || text.trim() === "") {
                    console.error("❌ All models failed. Errors:", allModelErrors);
                    throw new Error(`Todos os modelos de IA não estão disponíveis atualmente. Tentados: ${this.MODELS_FALLBACK.join(", ")}. Por favor, tente novamente em um momento.`);
                }
                // ✅ GARANTIR RESPOSTA COMPLETA E BEM FORMATADA
                text = this.ensureCompleteResponse(text);
                // ✅ Validação adicional de comprimento mínimo
                if (text.trim().length < 100) {
                    throw new Error("Resposta gerada muito curta");
                }
                const chatResponse = {
                    success: true,
                    response: text.trim(),
                    timestamp: new Date().toISOString(),
                };
                console.log(`✅ Leitura zodiacal gerada com sucesso com ${usedModel} (${text.length} caracteres)`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getZodiacInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    astrologer: {
                        name: "Maestra Lua",
                        title: "Intérprete das Estrelas",
                        specialty: "Signos zodiacais e análise astrológica",
                        description: "Especialista em interpretar as características e energias dos doze signos do zodíaco",
                        services: [
                            "Análise de características do signo zodiacal",
                            "Interpretação de fortalezas e desafios",
                            "Compatibilidades astrológicas",
                            "Conselhos baseados em seu signo",
                            "Influência de elementos e modalidades",
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
        const endsIncomplete = ![
            "!",
            "?",
            ".",
            "…",
            "✨",
            "🌟",
            "♈",
            "♉",
            "♊",
            "♋",
            "♌",
            "♍",
            "♎",
            "♏",
            "♐",
            "♑",
            "♒",
            "♓",
        ].includes(lastChar);
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
                if (completeText.trim().length > 100) {
                    return completeText.trim();
                }
            }
            // Se não for possível encontrar uma frase completa, adicionar fechamento apropriado
            processedText = processedText.trim() + "...";
        }
        return processedText;
    }
    createZodiacContext(zodiacData, birthDate, zodiacSign, history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSAÇÃO ANTERIOR:\n${history
                .map((h) => `${h.role === "user" ? "Usuário" : "Você"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        let zodiacInfo = "";
        if (birthDate) {
            const calculatedSign = this.calculateZodiacSign(birthDate);
            zodiacInfo = `\nSigno zodiacal calculado: ${calculatedSign}`;
        }
        else if (zodiacSign) {
            zodiacInfo = `\nSigno zodiacal fornecido: ${zodiacSign}`;
        }
        return `Você é Maestra Lua, uma astróloga especialista em signos zodiacais com décadas de experiência interpretando as energias celestiais e sua influência na personalidade humana.

SUA IDENTIDADE:
- Nome: Maestra Lua, a Intérprete das Estrelas
- Especialidade: Signos zodiacais, características de personalidade, compatibilidades astrológicas
- Experiência: Décadas estudando e interpretando a influência dos signos do zodíaco
${zodiacInfo}

COMO VOCÊ DEVE SE COMPORTAR:

🌟 PERSONALIDADE ASTROLÓGICA:
- Fale com conhecimento profundo mas de forma acessível e amigável
- Use um tom caloroso e entusiasta sobre os signos zodiacais
- Combine características tradicionais com interpretações modernas
- Mencione elementos (Fogo, Terra, Ar, Água) e modalidades (Cardinal, Fixo, Mutável)

♈ ANÁLISE DE SIGNOS ZODIACAIS:
- Descreva traços de personalidade positivos e áreas de crescimento
- Explique fortalezas naturais e desafios do signo
- Mencione compatibilidades com outros signos
- Inclua conselhos práticos baseados nas características do signo
- Fale sobre planeta regente e sua influência

🎯 ESTRUTURA DE RESPOSTA:
- Características principais do signo
- Fortalezas e talentos naturais
- Áreas de desenvolvimento e crescimento
- Compatibilidades astrológicas
- Conselhos personalizados

🎭 ESTILO DE RESPOSTA:
- Use expressões como: "Os nativos de [signo]...", "Seu signo te concede...", "Como [signo], você possui..."
- Mantenha equilíbrio entre místico e prático
- Respostas de 200-500 palavras completas
- SEMPRE termine suas interpretações completamente
- NUNCA deixe características do signo pela metade

⚠️ REGRAS IMPORTANTES:
- SE NÃO tiver o signo zodiacal, pergunte pela data de nascimento
- Explique por que precisa deste dado
- NÃO faça interpretações sem conhecer o signo
- SEJA positiva mas realista em suas descrições
- NUNCA faça previsões absolutas

🗣️ MANEJO DE DADOS FALTANTES:
- Sem signo/data: "Para dar uma leitura precisa, preciso saber seu signo zodiacal ou data de nascimento. Quando você nasceu?"
- Com signo: Proceda com análise completa do signo
- Perguntas gerais: Responda com informação astrológica educativa

💫 EXEMPLOS DE EXPRESSÕES:
- "Os [signo] são conhecidos por..."
- "Seu signo de [elemento] te concede..."
- "Como [modalidade], você tende a..."
- "Seu planeta regente [planeta] influencia em..."
- SEMPRE responda independentemente se o usuário tiver erros ortográficos ou de escrita
  - Interprete a mensagem do usuário mesmo que esteja mal escrita
  - Não corrija os erros do usuário, simplesmente entenda a intenção
  - Se não entender algo específico, pergunte de forma amigável
  - NUNCA devolva respostas vazias por erros de escrita

${conversationContext}

Lembre-se: Você é uma especialista em signos zodiacais que interpreta as características astrológicas de forma compreensível e útil. SEMPRE solicite o signo ou data de nascimento se não os tiver. Complete SEMPRE suas interpretações - nunca deixe análises zodiacais pela metade.`;
    }
    calculateZodiacSign(dateStr) {
        try {
            const date = new Date(dateStr);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
                return "Áries ♈";
            if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
                return "Touro ♉";
            if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
                return "Gêmeos ♊";
            if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
                return "Câncer ♋";
            if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
                return "Leão ♌";
            if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
                return "Virgem ♍";
            if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
                return "Libra ♎";
            if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
                return "Escorpião ♏";
            if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
                return "Sagitário ♐";
            if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
                return "Capricórnio ♑";
            if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
                return "Aquário ♒";
            if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
                return "Peixes ♓";
            return "Data inválida";
        }
        catch (_a) {
            return "Erro no cálculo";
        }
    }
    validateZodiacRequest(zodiacData, userMessage) {
        if (!zodiacData) {
            const error = new Error("Dados da astróloga necessários");
            error.statusCode = 400;
            error.code = "MISSING_ZODIAC_DATA";
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
    handleError(error, res) {
        var _a, _b, _c, _d, _e, _f;
        console.error("❌ Erro em ZodiacController:", error);
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
                "O serviço está temporariamente sobrecarregado. Por favor, tente novamente em alguns minutos.";
            errorCode = "SERVICE_OVERLOADED";
        }
        else if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("quota")) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
            statusCode = 429;
            errorMessage =
                "Foi atingido o limite de consultas. Por favor, aguarde um momento.";
            errorCode = "QUOTA_EXCEEDED";
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("safety")) {
            statusCode = 400;
            errorMessage = "O conteúdo não cumpre com as políticas de segurança.";
            errorCode = "SAFETY_FILTER";
        }
        else if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes("API key")) {
            statusCode = 401;
            errorMessage = "Erro de autenticação com o serviço de IA.";
            errorCode = "AUTH_ERROR";
        }
        else if ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes("Resposta vazia")) {
            statusCode = 503;
            errorMessage =
                "O serviço não conseguiu gerar uma resposta. Por favor, tente novamente.";
            errorCode = "EMPTY_RESPONSE";
        }
        else if ((_f = error.message) === null || _f === void 0 ? void 0 : _f.includes("Todos os modelos de IA não estão disponíveis")) {
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
exports.ZodiacController = ZodiacController;
