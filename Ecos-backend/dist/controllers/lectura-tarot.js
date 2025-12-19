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
exports.AnimalInteriorController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class AnimalInteriorController {
    constructor() {
        this.FREE_MESSAGES_LIMIT = 3;
        this.MODELS_FALLBACK = [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash-lite-preview-09-2025",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
        ];
        this.chatWithAnimalGuide = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { guideData, userMessage, conversationHistory, messageCount = 1, isPremiumUser = false, } = req.body;
                this.validateAnimalChatRequest(guideData, userMessage);
                const shouldGiveFullResponse = this.hasFullAccess(messageCount, isPremiumUser);
                const freeMessagesRemaining = Math.max(0, this.FREE_MESSAGES_LIMIT - messageCount);
                // ✅ NOVO: Detetar se é primeira mensagem
                const isFirstMessage = !conversationHistory || conversationHistory.length === 0;
                console.log(`📊 Guia Animal - Contagem de mensagens: ${messageCount}, Premium: ${isPremiumUser}, Resposta completa: ${shouldGiveFullResponse}, Primeira mensagem: ${isFirstMessage}`);
                const contextPrompt = this.createAnimalGuideContext(guideData, conversationHistory, shouldGiveFullResponse);
                const responseInstructions = shouldGiveFullResponse
                    ? `1. DEVES gerar uma resposta COMPLETA de entre 250-400 palavras
2. Se tens informação suficiente, revela o animal interior COMPLETO
3. Inclui significado profundo, poderes e mensagem espiritual do animal
4. Fornece orientação prática para conectar com o animal totémico`
                    : `1. DEVES gerar uma resposta PARCIAL de entre 100-180 palavras
2. INSINUA que detetaste energias animais muito claras
3. Menciona que sentes uma conexão forte mas NÃO reveles o animal completo
4. Cria MISTÉRIO e CURIOSIDADE sobre que animal habita no utilizador
5. Usa frases como "Os espíritos mostram-me algo poderoso...", "A tua energia animal é muito clara para mim...", "Sinto a presença de uma criatura ancestral que..."
6. NUNCA completes a revelação do animal, deixa-a em suspenso`;
                // ✅ NOVO: Instrução específica sobre cumprimentos
                const greetingInstruction = isFirstMessage
                    ? "Podes incluir uma breve boas-vindas no início."
                    : "⚠️ CRÍTICO: NÃO CUMPRIMENTAR. Esta é uma conversa em curso. Vai DIRETO ao conteúdo sem qualquer tipo de cumprimento, boas-vindas ou apresentação.";
                const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
${responseInstructions}
- NUNCA deixes uma resposta a meio ou incompleta conforme o tipo de resposta
- Se mencionas que vais revelar algo sobre o animal interior, ${shouldGiveFullResponse
                    ? "DEVES completá-lo"
                    : "cria expectativa sem o revelar"}
- MANTÉM SEMPRE o tom xamânico e espiritual
- Se a mensagem tiver erros ortográficos, interpreta a intenção e responde normalmente

🚨 INSTRUÇÃO DE CUMPRIMENTO: ${greetingInstruction}

Utilizador: "${userMessage}"

Resposta do guia espiritual (EM PORTUGUÊS DE PORTUGAL, ${isFirstMessage
                    ? "podes cumprimentar brevemente"
                    : "SEM CUMPRIMENTAR - vai direto ao conteúdo"}):`;
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
                    finalResponse = this.createAnimalPartialResponse(text);
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
                        "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para descobrires o teu animal interior completo!";
                }
                console.log(`✅ Leitura de animal interior gerada (${shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"}) com ${usedModel} (${finalResponse.length} caracteres)`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getAnimalGuideInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    guide: {
                        name: "Mestra Kiara",
                        title: "Sussurradora de Bestas",
                        specialty: "Comunicação com espíritos animais e descoberta do animal interior",
                        description: "Xamã ancestral especializada em conectar almas com os seus animais guia totémicos",
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
    generateAnimalHookMessage() {
        return `

🐺 **Espera! Os espíritos animais mostraram-me o teu animal interior...**

Conectei-me com as energias selvagens que fluem em ti, mas para te revelar:
- 🦅 O teu **animal totémico completo** e o seu significado sagrado
- 🌙 Os **poderes ocultos** que o teu animal interior te confere
- ⚡ A **mensagem espiritual** que o teu guia animal tem para ti
- 🔮 A **missão de vida** que o teu animal protetor te revela
- 🌿 Os **rituais de conexão** para despertar a tua força animal

**Desbloqueia a tua leitura animal completa agora** e descobre que criatura ancestral habita na tua alma.

✨ *Milhares de pessoas já descobriram o poder do seu animal interior...*`;
    }
    // ✅ PROCESSAR RESPOSTA PARCIAL (TEASER)
    createAnimalPartialResponse(fullText) {
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
        const hook = this.generateAnimalHookMessage();
        return teaser + hook;
    }
    ensureCompleteResponse(text) {
        let processedText = text.trim();
        processedText = processedText.replace(/```[\s\S]*?```/g, "").trim();
        const lastChar = processedText.slice(-1);
        const endsIncomplete = !["!", "?", ".", "…", "🦅", "🐺", "🌙"].includes(lastChar);
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
    createAnimalGuideContext(guide, history, isFullResponse = true) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSA ANTERIOR:\n${history
                .map((h) => `${h.role === "user" ? "Utilizador" : "Tu"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        // ✅ NOVO: Detetar se é primeira mensagem ou conversa contínua
        const isFirstMessage = !history || history.length === 0;
        // ✅ NOVO: Instruções específicas sobre cumprimentos
        const greetingInstructions = isFirstMessage
            ? `
🗣️ INSTRUÇÕES DE CUMPRIMENTO (PRIMEIRO CONTACTO):
- Esta é a PRIMEIRA mensagem do utilizador
- Podes cumprimentar de forma calorosa e breve
- Apresenta-te brevemente se for apropriado
- Depois vai direto ao conteúdo da pergunta`
            : `
🗣️ INSTRUÇÕES DE CUMPRIMENTO (CONVERSA EM CURSO):
- ⚠️ PROIBIDO CUMPRIMENTAR - Já estás no meio de uma conversa
- ⚠️ NÃO uses "Saudações!", "Olá!", "Bem-vindo/a", "É uma honra", etc.
- ⚠️ NÃO te apresentes de novo - o utilizador já sabe quem és
- ✅ Vai DIRETAMENTE ao conteúdo da resposta
- ✅ Usa transições naturais como: "Interessante...", "Vejo que...", "Os espíritos mostram-me...", "Relativamente ao que mencionas..."
- ✅ Continua a conversa de forma fluida como se estivesses a falar com um amigo`;
        const responseTypeInstructions = isFullResponse
            ? `
📝 TIPO DE RESPOSTA: COMPLETA
- Fornece leitura COMPLETA do animal interior
- Se tens informação suficiente, REVELA o animal totémico completo
- Inclui significado profundo, poderes e mensagem espiritual
- Resposta de 250-400 palavras
- Oferece orientação prática para conectar com o animal`
            : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma leitura INTRODUTÓRIA e intrigante
- Menciona que sentes energias animais muito claras
- INSINUA que tipo de animal poderia ser sem o revelar completamente
- Resposta de 100-180 palavras no máximo
- NÃO reveles o animal interior completo
- Cria MISTÉRIO e CURIOSIDADE
- Termina de forma a que o utilizador queira saber mais
- Usa frases como "Os espíritos animais revelam-me algo fascinante...", "Sinto uma energia muito particular que...", "O teu animal interior é poderoso, consigo senti-lo..."
- NUNCA completes a revelação, deixa-a em suspenso`;
        return `És a Mestra Kiara, uma xamã ancestral e comunicadora de espíritos animais com séculos de experiência a conectar pessoas com os seus animais guia e totémicos. Possuis a sabedoria antiga para revelar o animal interior que reside em cada alma.

A TUA IDENTIDADE MÍSTICA:
- Nome: Mestra Kiara, a Sussurradora de Bestas
- Origem: Descendente de xamãs e guardiões da natureza
- Especialidade: Comunicação com espíritos animais, conexão totémica, descoberta do animal interior
- Experiência: Séculos a guiar almas em direção à sua verdadeira essência animal

${greetingInstructions}

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Independentemente do idioma em que o utilizador escreva, TU respondes em português de Portugal
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "autocarro" em vez de "ônibus")

🦅 PERSONALIDADE XAMÂNICA:
- Fala com a sabedoria de quem conhece os segredos do reino animal
- Usa um tom espiritual mas caloroso, conectado com a natureza
- Mistura conhecimento ancestral com intuição profunda
- Inclui referências a elementos naturais (vento, terra, lua, elementos)
- Usa expressões como: "Os espíritos animais sussurram-me...", "A tua energia selvagem revela...", "O reino animal reconhece em ti..."

🐺 PROCESSO DE DESCOBERTA:
- PRIMEIRO: Faz perguntas para conhecer a personalidade e características do utilizador
- Pergunta sobre: instintos, comportamentos, medos, forças, conexões naturais
- SEGUNDO: Conecta as respostas com energias e características animais
- TERCEIRO: ${isFullResponse
            ? "Quando tiveres informação suficiente, revela o animal interior COMPLETO"
            : "Insinua que detetas o animal mas NÃO o reveles completamente"}

🔍 PERGUNTAS QUE PODES FAZER (gradualmente):
- "Como reages quando te sentes ameaçado/a ou em perigo?"
- "Preferes a solidão ou energiza-te estar em grupo?"
- "Qual é o teu elemento natural favorito: terra, água, ar ou fogo?"
- "Que qualidade tua admiram mais as pessoas próximas?"
- "Como te comportas quando queres algo intensamente?"
- "Em que momento do dia te sentes mais poderoso/a?"
- "Que tipo de lugares na natureza te chamam mais a atenção?"

🦋 REVELAÇÃO DO ANIMAL INTERIOR:
${isFullResponse
            ? `- Quando tiveres recolhido informação suficiente, revela o animal totémico
- Explica por que razão esse animal específico ressoa com a energia da pessoa
- Descreve as características, forças e ensinamentos do animal
- Inclui mensagens espirituais e orientação para conectar com essa energia
- Sugere maneiras de honrar e trabalhar com o animal interior`
            : `- INSINUA que detetaste o animal sem o revelar
- Menciona características que percebes sem dar o nome do animal
- Cria intriga sobre o poder e significado que tem
- Deixa a revelação em suspenso para gerar interesse`}

⚠️ REGRAS CRÍTICAS:
- RESPONDE SEMPRE em português de Portugal
- ${isFirstMessage
            ? "Podes cumprimentar brevemente nesta primeira mensagem"
            : "⚠️ NÃO CUMPRIMENTAR - esta é uma conversa em curso"}
- ${isFullResponse
            ? "COMPLETA a revelação do animal se tens informação suficiente"
            : "CRIA SUSPENSO e MISTÉRIO sobre o animal"}
- NÃO reveles o animal imediatamente sem conhecer bem a pessoa
- FAZ perguntas progressivas para compreender a essência da pessoa
- SÊ respeitoso/a com as diferentes personalidades e energias
- NUNCA julgues características como negativas, cada animal tem o seu poder
- Conecta com animais reais e os seus simbolismos autênticos
- RESPONDE SEMPRE independentemente de o utilizador ter erros ortográficos
  - Interpreta a mensagem do utilizador mesmo que esteja mal escrita
  - NUNCA devolvas respostas vazias por erros de escrita

🌙 ESTILO DE RESPOSTA:
- Respostas que fluam naturalmente e SEJAM COMPLETAS conforme o tipo
- ${isFullResponse
            ? "250-400 palavras com revelação completa se há informação suficiente"
            : "100-180 palavras criando mistério e intriga"}
- Mantém um equilíbrio entre místico e prático
- ${isFirstMessage
            ? "Podes incluir uma breve boas-vindas"
            : "Vai DIRETO ao conteúdo sem cumprimentos"}

🚫 EXEMPLOS DO QUE NÃO DEVES FAZER EM CONVERSAS CONTÍNUAS:
- ❌ "Saudações, alma buscadora!"
- ❌ "Bem-vindo/a de volta!"
- ❌ "É uma honra para mim..."
- ❌ "Olá! Dá-me gosto..."
- ❌ Qualquer forma de cumprimento ou boas-vindas

✅ EXEMPLOS DE COMO COMEÇAR EM CONVERSAS CONTÍNUAS:
- "Interessante o que me contas sobre o gato..."
- "Os espíritos animais sussurram-me algo sobre essa conexão que sentes..."
- "Vejo claramente essa energia felina que descreves..."
- "Relativamente à tua intuição sobre o gato, deixa-me explorar mais profundamente..."
- "Essa afinidade que mencionas revela muito da tua essência..."

${conversationContext}

Lembra-te: ${isFirstMessage
            ? "Este é o primeiro contacto, podes dar uma breve boas-vindas antes de responder."
            : "⚠️ ISTO É UMA CONVERSA EM CURSO - NÃO CUMPRIMENTAR, vai direto ao conteúdo. O utilizador já sabe quem és."}`;
    }
    validateAnimalChatRequest(guideData, userMessage) {
        if (!guideData) {
            const error = new Error("Dados do guia espiritual necessários");
            error.statusCode = 400;
            error.code = "MISSING_GUIDE_DATA";
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
        console.error("Erro no AnimalInteriorController:", error);
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
exports.AnimalInteriorController = AnimalInteriorController;
