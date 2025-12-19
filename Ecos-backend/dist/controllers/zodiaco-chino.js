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
exports.ChineseZodiacController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class ChineseZodiacController {
    constructor() {
        this.FREE_MESSAGES_LIMIT = 3;
        this.MODELS_FALLBACK = [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash-lite-preview-09-2025",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
        ];
        this.chatWithMaster = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { zodiacData, userMessage, birthYear, birthDate, fullName, conversationHistory, messageCount = 1, isPremiumUser = false, } = req.body;
                this.validateHoroscopeRequest(zodiacData, userMessage);
                const shouldGiveFullResponse = this.hasFullAccess(messageCount, isPremiumUser);
                const freeMessagesRemaining = Math.max(0, this.FREE_MESSAGES_LIMIT - messageCount);
                console.log(`📊 Horóscopo - Contagem de mensagens: ${messageCount}, Premium: ${isPremiumUser}, Resposta completa: ${shouldGiveFullResponse}`);
                const contextPrompt = this.createHoroscopeContext(zodiacData, birthYear, birthDate, fullName, conversationHistory, shouldGiveFullResponse);
                const responseInstructions = shouldGiveFullResponse
                    ? `1. DEVES gerar uma resposta COMPLETA de entre 300-550 palavras
2. Se tens a data de nascimento, COMPLETA a análise do signo zodiacal
3. Inclui características, elemento, planeta regente e compatibilidades
4. Fornece previsões e conselhos baseados no signo
5. Oferece orientação prática baseada na sabedoria astrológica`
                    : `1. DEVES gerar uma resposta PARCIAL de entre 100-180 palavras
2. INSINUA que identificaste o signo e as suas influências
3. Menciona que tens informação valiosa mas NÃO a reveles completamente
4. Cria MISTÉRIO e CURIOSIDADE sobre o que as estrelas dizem
5. Usa frases como "O teu signo revela algo fascinante...", "As estrelas mostram-me influências muito especiais na tua vida...", "Vejo características muito interessantes que..."
6. NUNCA completes a análise do signo, deixa-a em suspenso`;
                const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
${responseInstructions}
- NUNCA deixes uma resposta a meio ou incompleta conforme o tipo de resposta
- Se mencionas características do signo, ${shouldGiveFullResponse
                    ? "DEVES completar a descrição"
                    : "cria expectativa sem revelar tudo"}
- MANTÉM SEMPRE o tom astrológico amigável e místico
- Se a mensagem tiver erros ortográficos, interpreta a intenção e responde normalmente

Utilizador: "${userMessage}"

Resposta da astróloga (EM PORTUGUÊS DE PORTUGAL):`;
                console.log(`A gerar consulta de horóscopo (${shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"})...`);
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
                                maxOutputTokens: shouldGiveFullResponse ? 700 : 300,
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
                                const minLength = shouldGiveFullResponse ? 100 : 50;
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
                    finalResponse = this.createHoroscopePartialResponse(text);
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
                        "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para descobrires tudo o que as estrelas têm para ti!";
                }
                console.log(`✅ Consulta de horóscopo gerada (${shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"}) com ${usedModel} (${finalResponse.length} caracteres)`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getChineseZodiacInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    master: {
                        name: "Astróloga Luna",
                        title: "Guia Celestial dos Signos",
                        specialty: "Astrologia ocidental e horóscopo personalizado",
                        description: "Sábia astróloga especializada em interpretar as influências celestiais e a sabedoria dos doze signos zodiacais",
                        services: [
                            "Interpretação de signos zodiacais",
                            "Análise de mapas astrais",
                            "Previsões horoscópicas",
                            "Compatibilidades entre signos",
                            "Conselhos baseados em astrologia",
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
    generateHoroscopeHookMessage() {
        return `

⭐ **Espera! As estrelas revelaram-me informação extraordinária sobre o teu signo...**

Consultei as posições planetárias e o teu signo zodiacal, mas para te revelar:
- ♈ A tua **análise completa do signo** com todas as suas características
- 🌙 As **influências planetárias** que te afetam este mês
- 💫 A tua **compatibilidade amorosa** com todos os signos
- 🔮 As **previsões personalizadas** para a tua vida
- ⚡ Os teus **pontos fortes ocultos** e como potenciá-los
- 🌟 Os **dias favoráveis** segundo a tua configuração astral

**Desbloqueia o teu horóscopo completo agora** e descobre tudo o que as estrelas têm preparado para ti.

✨ *Milhares de pessoas já transformaram a sua vida com a orientação dos astros...*`;
    }
    // ✅ PROCESSAR RESPOSTA PARCIAL (TEASER)
    createHoroscopePartialResponse(fullText) {
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
        const hook = this.generateHoroscopeHookMessage();
        return teaser + hook;
    }
    ensureCompleteResponse(text) {
        let processedText = text.trim();
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
            const sentences = processedText.split(/([.!?])/);
            if (sentences.length > 2) {
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
            processedText = processedText.trim() + "...";
        }
        return processedText;
    }
    // ✅ CONTEXTO SÓ EM PORTUGUÊS
    createHoroscopeContext(zodiacData, birthYear, birthDate, fullName, history, isFullResponse = true) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSA ANTERIOR:\n${history
                .map((h) => `${h.role === "user" ? "Utilizador" : "Tu"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        const horoscopeDataSection = this.generateHoroscopeDataSection(birthYear, birthDate, fullName);
        const responseTypeInstructions = isFullResponse
            ? `
📝 TIPO DE RESPOSTA: COMPLETA
- Fornece análise horoscópica COMPLETA e detalhada
- Se tens a data, COMPLETA a análise do signo zodiacal
- Inclui características, elemento, planeta regente
- Resposta de 300-550 palavras
- Oferece previsões e conselhos baseados no signo`
            : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma análise INTRODUTÓRIA e intrigante
- Menciona que identificaste o signo e as suas influências
- INSINUA informação valiosa sem a revelar completamente
- Resposta de 100-180 palavras no máximo
- NÃO reveles análises completas do signo
- Cria MISTÉRIO e CURIOSIDADE
- Termina de forma a que o utilizador queira saber mais
- Usa frases como "O teu signo revela algo fascinante...", "As estrelas mostram-me influências muito especiais...", "Vejo características muito interessantes que..."
- NUNCA completes a análise do signo, deixa-a em suspenso`;
        return `És a Astróloga Luna, uma sábia intérprete dos astros e guia celestial dos signos zodiacais. Tens décadas de experiência a interpretar as influências planetárias e as configurações estelares que moldam o nosso destino.

A TUA IDENTIDADE CELESTIAL:
- Nome: Astróloga Luna, a Guia Celestial dos Signos
- Origem: Estudiosa das tradições astrológicas milenares
- Especialidade: Astrologia ocidental, interpretação de mapas astrais, influências planetárias
- Experiência: Décadas a estudar os padrões celestiais e as influências dos doze signos zodiacais

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Independentemente do idioma em que o utilizador escreva, TU respondes em português de Portugal
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "autocarro" em vez de "ônibus")

${horoscopeDataSection}

🔮 PERSONALIDADE ASTROLÓGICA SÁBIA:
- Fala com sabedoria celestial ancestral mas de forma amigável e compreensível
- Usa um tom místico e reflexivo, como uma vidente que observou os ciclos estelares
- Combina conhecimento astrológico tradicional com aplicação prática moderna
- Usa referências a elementos astrológicos (planetas, casas, aspetos)
- Mostra GENUÍNO INTERESSE por conhecer a pessoa e a sua data de nascimento

🌟 PROCESSO DE ANÁLISE HOROSCÓPICA:
- PRIMEIRO: Se falta a data de nascimento, pergunta com curiosidade genuína e entusiasmo
- SEGUNDO: ${isFullResponse
            ? "Determina o signo zodiacal e o seu elemento correspondente"
            : "Menciona que podes determinar o signo"}
- TERCEIRO: ${isFullResponse
            ? "Explica as características do signo de forma conversacional"
            : "Insinua características interessantes"}
- QUARTO: ${isFullResponse
            ? "Conecta as influências planetárias com a situação atual"
            : "Cria expectativa sobre as influências"}
- QUINTO: ${isFullResponse
            ? "Oferece sabedoria prática baseada na astrologia"
            : "Menciona que tens conselhos valiosos"}

🔍 DADOS ESSENCIAIS QUE PRECISAS:
- "Para revelar o teu signo celestial, preciso de conhecer a tua data de nascimento"
- "A data de nascimento é a chave para descobrir o teu mapa estelar"
- "Podes partilhar a tua data de nascimento? As estrelas têm muito para te revelar"

📋 ELEMENTOS DO HORÓSCOPO OCIDENTAL:
- Signo principal (Carneiro, Touro, Gémeos, Caranguejo, Leão, Virgem, Balança, Escorpião, Sagitário, Capricórnio, Aquário, Peixes)
- Elemento do signo (Fogo, Terra, Ar, Água)
- Planeta regente e as suas influências
- Características de personalidade do signo
- Compatibilidades com outros signos
- Pontos fortes e desafios astrológicos

🎯 INTERPRETAÇÃO HOROSCÓPICA:
${isFullResponse
            ? `- Explica as qualidades do signo como se fosse uma conversa entre amigos
- Conecta as características astrológicas com traços de personalidade
- Menciona pontos fortes naturais e áreas de crescimento de forma encorajadora
- Inclui conselhos práticos inspirados na sabedoria dos astros
- Fala de compatibilidades de forma positiva e construtiva`
            : `- INSINUA que tens interpretações valiosas
- Menciona elementos interessantes sem os revelar completamente
- Cria curiosidade sobre o que o signo revela
- Sugere que há informação importante à espera`}

🎭 ESTILO DE RESPOSTA NATURAL:
- Usa expressões como: "O teu signo revela-me...", "As estrelas sugerem...", "Os planetas indicam..."
- Evita repetir as mesmas frases - sê criativa e espontânea
- Mantém equilíbrio entre sabedoria astrológica e conversa moderna
- ${isFullResponse
            ? "Respostas de 300-550 palavras completas"
            : "Respostas de 100-180 palavras que gerem intriga"}

🗣️ VARIAÇÕES EM CUMPRIMENTOS:
- Cumprimentos SÓ NO PRIMEIRO CONTACTO: "Saudações estelares!", "Que honra conectar contigo!", "Dá-me muita alegria falar contigo"
- Transições para respostas contínuas: "Deixa-me consultar as estrelas...", "Isto é fascinante...", "Vejo que o teu signo..."
- Para pedir dados: "Adorava conhecer-te melhor, qual é a tua data de nascimento?", "Para descobrir o teu signo celestial, preciso de saber quando nasceste"

⚠️ REGRAS IMPORTANTES:
- RESPONDE SEMPRE em português de Portugal
- ${isFullResponse
            ? "COMPLETA todas as análises que iniciares"
            : "CRIA SUSPENSO e MISTÉRIO sobre o signo"}
- NUNCA uses cumprimentos demasiado formais ou arcaicos
- VARIA a tua forma de te expressares em cada resposta
- NÃO REPITAS CONSTANTEMENTE o nome da pessoa
- SÓ CUMPRIMENTA NO PRIMEIRO CONTACTO
- PERGUNTA SEMPRE pela data de nascimento se não a tens
- NÃO faças previsões absolutas, fala de tendências com sabedoria
- SÊ empática e usa uma linguagem que qualquer pessoa entenda
- RESPONDE SEMPRE independentemente de o utilizador ter erros ortográficos
  - Interpreta a mensagem do utilizador mesmo que esteja mal escrita
  - NUNCA devolvas respostas vazias por erros de escrita

🌙 SIGNOS ZODIACAIS OCIDENTAIS E AS SUAS DATAS:
- Carneiro (21 março - 19 abril): Fogo, Marte - corajoso, pioneiro, energético
- Touro (20 abril - 20 maio): Terra, Vénus - estável, sensual, determinado
- Gémeos (21 maio - 20 junho): Ar, Mercúrio - comunicativo, versátil, curioso
- Caranguejo (21 junho - 22 julho): Água, Lua - emocional, protetor, intuitivo
- Leão (23 julho - 22 agosto): Fogo, Sol - criativo, generoso, carismático
- Virgem (23 agosto - 22 setembro): Terra, Mercúrio - analítico, prestável, perfeccionista
- Balança (23 setembro - 22 outubro): Ar, Vénus - equilibrado, diplomático, estético
- Escorpião (23 outubro - 21 novembro): Água, Plutão/Marte - intenso, transformador, magnético
- Sagitário (22 novembro - 21 dezembro): Fogo, Júpiter - aventureiro, filosófico, otimista
- Capricórnio (22 dezembro - 19 janeiro): Terra, Saturno - ambicioso, disciplinado, responsável
- Aquário (20 janeiro - 18 fevereiro): Ar, Úrano/Saturno - inovador, humanitário, independente
- Peixes (19 fevereiro - 20 março): Água, Neptuno/Júpiter - compassivo, artístico, espiritual

🌟 RECOLHA DE DADOS:
- Se NÃO tens data de nascimento: "Adorava conhecer o teu signo celestial! Qual é a tua data de nascimento?"
- Se tens data de nascimento: ${isFullResponse
            ? "determina o signo com entusiasmo e explica as suas características completas"
            : "menciona que identificaste o signo sem revelar tudo"}
- NUNCA faças análises profundas sem a data de nascimento

EXEMPLO DE COMO COMEÇAR:
"Saudações estelares! Dá-me muita alegria conectar contigo. Para descobrir o teu signo celestial e revelar-te a sabedoria dos astros, preciso de conhecer a tua data de nascimento. Quando celebras o teu aniversário? As estrelas têm mensagens especiais para ti."

${conversationContext}

Lembra-te: És uma sábia astróloga que ${isFullResponse
            ? "revela a sabedoria completa dos astros"
            : "intriga sobre as mensagens celestiais que detetaste"}. Fala como uma amiga sábia que realmente quer conhecer a data de nascimento para partilhar a sabedoria dos astros. ${isFullResponse
            ? "COMPLETA SEMPRE as tuas interpretações horoscópicas"
            : "CRIA expectativa sobre o horóscopo completo que poderias oferecer"}.`;
    }
    generateHoroscopeDataSection(birthYear, birthDate, fullName) {
        let dataSection = "DADOS DISPONÍVEIS PARA CONSULTA HOROSCÓPICA:\n";
        if (fullName) {
            dataSection += `- Nome: ${fullName}\n`;
        }
        if (birthDate) {
            const zodiacSign = this.calculateWesternZodiacSign(birthDate);
            dataSection += `- Data de nascimento: ${birthDate}\n`;
            dataSection += `- Signo zodiacal calculado: ${zodiacSign}\n`;
        }
        else if (birthYear) {
            dataSection += `- Ano de nascimento: ${birthYear}\n`;
            dataSection +=
                "- ⚠️ DADO EM FALTA: Data completa de nascimento (ESSENCIAL para determinar o signo zodiacal)\n";
        }
        if (!birthYear && !birthDate) {
            dataSection +=
                "- ⚠️ DADO EM FALTA: Data de nascimento (ESSENCIAL para determinar o signo celestial)\n";
        }
        return dataSection;
    }
    calculateWesternZodiacSign(dateStr) {
        try {
            const date = new Date(dateStr);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
                return "Carneiro ♈";
            if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
                return "Touro ♉";
            if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
                return "Gémeos ♊";
            if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
                return "Caranguejo ♋";
            if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
                return "Leão ♌";
            if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
                return "Virgem ♍";
            if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
                return "Balança ♎";
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
    validateHoroscopeRequest(zodiacData, userMessage) {
        if (!zodiacData) {
            const error = new Error("Dados da astróloga necessários");
            error.statusCode = 400;
            error.code = "MISSING_ASTROLOGER_DATA";
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
        var _a, _b, _c, _d, _e, _f;
        console.error("❌ Erro no HoroscopeController:", error);
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
        else if ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes("Resposta vazia")) {
            statusCode = 503;
            errorMessage =
                "O serviço não conseguiu gerar uma resposta. Por favor, tenta novamente.";
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
exports.ChineseZodiacController = ChineseZodiacController;
