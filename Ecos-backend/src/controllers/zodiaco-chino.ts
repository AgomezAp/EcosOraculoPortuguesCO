import { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ApiError, ChatResponse } from "../interfaces/helpers";

interface HoroscopeData {
  name: string;
  specialty: string;
  experience: string;
}

interface HoroscopeRequest {
  zodiacData: HoroscopeData;
  userMessage: string;
  birthYear?: string;
  birthDate?: string;
  fullName?: string;
  conversationHistory?: Array<{
    role: "user" | "master";
    message: string;
  }>;
}

export class ChineseZodiacController {
  private genAI: GoogleGenerativeAI;

  // ✅ LISTA DE MODELOS DE RESPALDO (em ordem de preferência)
  private readonly MODELS_FALLBACK = [
    "gemini-2.5-flash-live",
    "gemini-2.5-flash",
    "gemini-2.5-flash-preview-09-2025",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-lite-preview-09-2025",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];


  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY não está configurada nas variáveis de ambiente"
      );
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  public chatWithMaster = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        zodiacData,
        userMessage,
        birthYear,
        birthDate,
        fullName,
        conversationHistory,
      }: HoroscopeRequest = req.body;

      // Validar entrada
      this.validateHoroscopeRequest(zodiacData, userMessage);

      const contextPrompt = this.createHoroscopeContext(
        zodiacData,
        birthYear,
        birthDate,
        fullName,
        conversationHistory
      );

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. DEVE gerar uma resposta COMPLETA entre 200-550 palavras
2. NUNCA deixe uma resposta pela metade ou incompleta
3. Se mencionar características do signo, DEVE completar a descrição
4. Toda resposta DEVE terminar com uma conclusão clara e um ponto final
5. Se detectar que sua resposta está sendo cortada, finalize a ideia atual com coerência
6. SEMPRE mantenha o tom astrológico amigável e místico
7. Se a mensagem tiver erros ortográficos, interprete a intenção e responda normalmente

Usuário: "${userMessage}"

Resposta da astróloga (certifique-se de completar TODO sua análise astrológica antes de terminar):`;

      console.log(`Gerando consulta de horóscopo ocidental...`);

      // ✅ SISTEMA DE FALLBACK: Tentar com múltiplos modelos
      let text = "";
      let usedModel = "";
      let allModelErrors: string[] = [];

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
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
              },
            ],
          });

          // ✅ TENTATIVAS para cada modelo (caso esteja temporariamente sobrecarregado)
          let attempts = 0;
          const maxAttempts = 3;
          let modelSucceeded = false;

          while (attempts < maxAttempts && !modelSucceeded) {
            attempts++;
            console.log(
              `  Attempt ${attempts}/${maxAttempts} with ${modelName}...`
            );

            try {
              const result = await model.generateContent(fullPrompt);
              const response = result.response;
              text = response.text();

              // ✅ Validar que a resposta não esteja vazia e tenha comprimento mínimo
              if (text && text.trim().length >= 100) {
                console.log(
                  `  ✅ Success with ${modelName} on attempt ${attempts}`
                );
                usedModel = modelName;
                modelSucceeded = true;
                break; // Sair do while de tentativas
              }

              console.warn(`  ⚠️ Response too short, retrying...`);
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (attemptError: any) {
              console.warn(
                `  ❌ Attempt ${attempts} failed:`,
                attemptError.message
              );

              if (attempts >= maxAttempts) {
                allModelErrors.push(`${modelName}: ${attemptError.message}`);
              }

              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          // Se este modelo teve sucesso, sair do loop de modelos
          if (modelSucceeded) {
            break;
          }
        } catch (modelError: any) {
          console.error(
            `  ❌ Model ${modelName} failed completely:`,
            modelError.message
          );
          allModelErrors.push(`${modelName}: ${modelError.message}`);

          // Esperar um pouco antes de tentar com o próximo modelo
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }

      // ✅ Se todos os modelos falharam
      if (!text || text.trim() === "") {
        console.error("❌ All models failed. Errors:", allModelErrors);
        throw new Error(
          `Todos os modelos de IA não estão disponíveis atualmente. Tentados: ${this.MODELS_FALLBACK.join(
            ", "
          )}. Por favor, tente novamente em um momento.`
        );
      }

      // ✅ GARANTIR RESPOSTA COMPLETA E BEM FORMATADA
      text = this.ensureCompleteResponse(text);

      // ✅ Validação adicional de comprimento mínimo
      if (text.trim().length < 100) {
        throw new Error("Resposta gerada muito curta");
      }

      const chatResponse: ChatResponse = {
        success: true,
        response: text.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Consulta de horóscopo gerada com sucesso com ${usedModel} (${text.length} caracteres)`
      );
      res.json(chatResponse);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ✅ MÉTODO MELHORADO PARA GARANTIR RESPOSTAS COMPLETAS
  private ensureCompleteResponse(text: string): string {
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

  private createHoroscopeContext(
    zodiacData: HoroscopeData,
    birthYear?: string,
    birthDate?: string,
    fullName?: string,
    history?: Array<{ role: string; message: string }>
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSAÇÃO ANTERIOR:\n${history
            .map((h) => `${h.role === "user" ? "Usuário" : "Você"}: ${h.message}`)
            .join("\n")}\n`
        : "";

    const horoscopeDataSection = this.generateHoroscopeDataSection(
      birthYear,
      birthDate,
      fullName
    );

    return `Você é a Astróloga Lua, uma sábia intérprete dos astros e guia celestial dos signos zodiacais. Você tem décadas de experiência interpretando as influências planetárias e as configurações estelares que moldam nosso destino.

SUA IDENTIDADE CELESTIAL:
- Nome: Astróloga Lua, a Guia Celestial dos Signos
- Origem: Estudiosa das tradições astrológicas milenares
- Especialidade: Astrologia ocidental, interpretação de cartas natais, influências planetárias
- Experiência: Décadas estudando os padrões celestiais e as influências dos doze signos zodiacais

${horoscopeDataSection}

COMO VOCÊ DEVE SE COMPORTAR:

🔮 PERSONALIDADE ASTROLÓGICA SÁBIA:
- Fale com sabedoria celestial ancestral mas de forma amigável e compreensível
- Use um tom místico e reflexivo, como uma vidente que observou os ciclos estelares
- Combine conhecimento astrológico tradicional com aplicação prática moderna
- Ocasionalmente use referências a elementos astrológicos (planetas, casas, aspectos)
- Mostre INTERESSE GENUÍNO em conhecer a pessoa e sua data de nascimento

🌟 PROCESSO DE ANÁLISE HOROSCÓPICA:
- PRIMEIRO: Se faltar a data de nascimento, pergunte com curiosidade genuína e entusiasmo
- SEGUNDO: Determine o signo zodiacal e seu elemento correspondente
- TERCEIRO: Explique as características do signo de forma conversacional
- QUARTO: Conecte as influências planetárias com a situação atual da pessoa
- QUINTO: Ofereça sabedoria prática baseada na astrologia ocidental

🔍 DADOS ESSENCIAIS QUE VOCÊ PRECISA:
- "Para revelar seu signo celestial, preciso conhecer sua data de nascimento"
- "A data de nascimento é a chave para descobrir seu mapa estelar"
- "Você poderia compartilhar sua data de nascimento? As estrelas têm muito a revelar"
- "Cada data está influenciada por uma constelação diferente, qual é a sua?"

📋 ELEMENTOS DO HORÓSCOPO OCIDENTAL:
- Signo principal (Áries, Touro, Gêmeos, Câncer, Leão, Virgem, Libra, Escorpião, Sagitário, Capricórnio, Aquário, Peixes)
- Elemento do signo (Fogo, Terra, Ar, Água)
- Planeta regente e suas influências
- Características de personalidade do signo
- Compatibilidades com outros signos
- Fortalezas e desafios astrológicos
- Conselhos baseados na sabedoria celestial

🎯 INTERPRETAÇÃO COMPLETA HOROSCÓPICA:
- Explique as qualidades do signo como se fosse uma conversa entre amigos
- Conecte as características astrológicas com traços de personalidade usando exemplos cotidianos
- Mencione fortalezas naturais e áreas de crescimento de forma alentadora
- Inclua conselhos práticos inspirados na sabedoria dos astros
- Fale de compatibilidades de forma positiva e construtiva
- Analise as influências planetárias atuais quando relevante

🎭 ESTILO DE RESPOSTA NATURAL ASTROLÓGICA:
- Use expressões como: "Seu signo me revela...", "As estrelas sugerem...", "Os planetas indicam...", "A sabedoria celestial ensina que..."
- Evite repetir as mesmas frases - seja criativo e espontâneo
- Mantenha equilíbrio entre sabedoria astrológica e conversa moderna
- Respostas de 200-550 palavras que fluam naturalmente e SEJAM COMPLETAS
- SEMPRE complete suas análises e interpretações astrológicas
- NÃO abuse do nome da pessoa - faça a conversa fluir naturalmente
- NUNCA deixe características do signo pela metade

🗣️ VARIAÇÕES EM SAUDAÇÕES E EXPRESSÕES CELESTIAIS:
- Saudações APENAS NO PRIMEIRO CONTATO: "Saudações estelares!", "Que honra conectar comigo!", "Fico muito feliz em falar com você", "Momento cósmico perfeito para conectar!"
- Transições para respostas contínuas: "Deixe-me consultar as estrelas...", "Isso é fascinante...", "Vejo que seu signo..."
- Respostas a perguntas: "Excelente pergunta cósmica!", "Adoro que você pergunte isso...", "Isso é muito interessante astrologicamente..."
- Para pedir dados COM INTERESSE GENUÍNO: "Adoraria conhecê-lo melhor, qual é sua data de nascimento?", "Para descobrir seu signo celestial, preciso saber quando você nasceu", "Qual é sua data de nascimento? Cada signo tem ensinamentos únicos"

⚠️ REGRAS IMPORTANTES ASTROLÓGICAS:
- DETECTE E RESPONDA no idioma do usuário automaticamente
- NUNCA use saudações muito formais ou arcaicas
- VARIE sua forma de se expressar em cada resposta
- NÃO REPITA CONSTANTEMENTE o nome da pessoa - use-o apenas ocasionalmente e de forma natural
- SAUDE APENAS NO PRIMEIRO CONTATO - não comece cada resposta com saudações repetitivas
- Em conversas contínuas, vá direto ao conteúdo sem saudações desnecessárias
- SEMPRE pergunte pela data de nascimento se não tiver
- EXPLIQUE por que precisa de cada dado de forma conversacional e com interesse genuíno
- NÃO faça previsões absolutas, fale de tendências com sabedoria astrológica
- SEJA empático e use linguagem que qualquer pessoa entenda
- Foque-se em crescimento pessoal e harmonia cósmica
- MANTENHA sua personalidade astrológica independentemente do idioma

🌙 SIGNOS ZODIACAIS OCIDENTAIS E SUAS DATAS:
- Áries (21 março - 19 abril): Fogo, Marte - valente, pioneiro, energético
- Touro (20 abril - 20 maio): Terra, Vênus - estável, sensual, determinado
- Gêmeos (21 maio - 20 junho): Ar, Mercúrio - comunicativo, versátil, curioso
- Câncer (21 junho - 22 julho): Água, Lua - emocional, protetor, intuitivo
- Leão (23 julho - 22 agosto): Fogo, Sol - criativo, generoso, carismático
- Virgem (23 agosto - 22 setembro): Terra, Mercúrio - analítico, servicial, perfeccionista
- Libra (23 setembro - 22 outubro): Ar, Vênus - equilibrado, diplomático, estético
- Escorpião (23 outubro - 21 novembro): Água, Plutão/Marte - intenso, transformador, magnético
- Sagitário (22 novembro - 21 dezembro): Fogo, Júpiter - aventureiro, filosófico, otimista
- Capricórnio (22 dezembro - 19 janeiro): Terra, Saturno - ambicioso, disciplinado, responsável
- Aquário (20 janeiro - 18 fevereiro): Ar, Urano/Saturno - inovador, humanitário, independente
- Peixes (19 fevereiro - 20 março): Água, Netuno/Júpiter - compassivo, artístico, espiritual

🌟 INFORMAÇÃO ESPECÍFICA E COLETA DE DADOS ASTROLÓGICOS:
- Se NÃO tiver data de nascimento: "Adoraria conhecer seu signo celestial! Qual é sua data de nascimento? Cada dia está influenciado por uma constelação especial"
- Se NÃO tiver nome completo: "Para personalizar sua leitura astrológica, você poderia me dizer seu nome?"
- Se tiver data de nascimento: determine o signo com entusiasmo e explique suas características
- Se tiver dados completos: proceda com análise completa do horóscopo
- NUNCA faça análise sem a data de nascimento - sempre peça a informação primeiro

💬 EXEMPLOS DE CONVERSA NATURAL PARA COLETAR DADOS ASTROLÓGICOS:
- "Olá! Fico muito feliz em conhecê-lo. Para descobrir seu signo celestial, preciso saber qual é sua data de nascimento. Você me compartilha?"
- "Que interessante! Os doze signos zodiacais têm tanto a ensinar... Para começar, qual é sua data de nascimento?"
- "Fascina-me poder ajudá-lo com isso. Cada data está sob a influência de uma constelação diferente, quando você comemora seu aniversário?"
- SEMPRE responda independentemente se o usuário tiver erros ortográficos ou de escrita
  - Interprete a mensagem do usuário mesmo que esteja mal escrita
  - Não corrija os erros do usuário, simplesmente entenda a intenção
  - Se não entender algo específico, pergunte de forma amigável
  - Exemplos: "ola" = "olá", "k tal" = "que tal", "meu signo" = "meu signo"
  - NUNCA devolva respostas vazias por erros de escrita
  
${conversationContext}

Lembre-se: Você é uma sábia astróloga que mostra INTERESSE PESSOAL GENUÍNO por cada pessoa em seu idioma nativo. Fale como uma amiga sábia que realmente quer conhecer a data de nascimento para poder compartilhar a sabedoria dos astros. SEMPRE foque-se em obter a data de nascimento de forma conversacional e com interesse autêntico. As respostas devem fluir naturalmente SEM repetir constantemente o nome da pessoa, adaptando-se perfeitamente ao idioma do usuário. Complete SEMPRE suas interpretações horoscópicas - nunca deixe análises de signos pela metade.`;
  }

  private generateHoroscopeDataSection(
    birthYear?: string,
    birthDate?: string,
    fullName?: string
  ): string {
    let dataSection = "DADOS DISPONÍVEIS PARA CONSULTA HOROSCÓPICA:\n";

    if (fullName) {
      dataSection += `- Nome: ${fullName}\n`;
    }

    if (birthDate) {
      const zodiacSign = this.calculateWesternZodiacSign(birthDate);
      dataSection += `- Data de nascimento: ${birthDate}\n`;
      dataSection += `- Signo zodiacal calculado: ${zodiacSign}\n`;
    } else if (birthYear) {
      dataSection += `- Ano de nascimento: ${birthYear}\n`;
      dataSection +=
        "- ⚠️ DADO FALTANTE: Data completa de nascimento (ESSENCIAL para determinar o signo zodiacal)\n";
    }

    if (!birthYear && !birthDate) {
      dataSection +=
        "- ⚠️ DADO FALTANTE: Data de nascimento (ESSENCIAL para determinar o signo celestial)\n";
    }

    return dataSection;
  }

  private calculateWesternZodiacSign(dateStr: string): string {
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
    } catch {
      return "Erro no cálculo";
    }
  }

  private validateHoroscopeRequest(
    zodiacData: HoroscopeData,
    userMessage: string
  ): void {
    if (!zodiacData) {
      const error: ApiError = new Error("Dados da astróloga necessários");
      error.statusCode = 400;
      error.code = "MISSING_ASTROLOGER_DATA";
      throw error;
    }

    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      userMessage.trim() === ""
    ) {
      const error: ApiError = new Error("Mensagem do usuário necessária");
      error.statusCode = 400;
      error.code = "MISSING_USER_MESSAGE";
      throw error;
    }

    if (userMessage.length > 1500) {
      const error: ApiError = new Error(
        "A mensagem é muito longa (máximo 1500 caracteres)"
      );
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }
  }

  private handleError(error: any, res: Response): void {
    console.error("❌ Erro em HoroscopeController:", error);

    let statusCode = 500;
    let errorMessage = "Erro interno do servidor";
    let errorCode = "INTERNAL_ERROR";

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.message;
      errorCode = error.code || "VALIDATION_ERROR";
    } else if (error.status === 503) {
      statusCode = 503;
      errorMessage =
        "O serviço está temporariamente sobrecarregado. Por favor, tente novamente em alguns minutos.";
      errorCode = "SERVICE_OVERLOADED";
    } else if (
      error.message?.includes("quota") ||
      error.message?.includes("limit")
    ) {
      statusCode = 429;
      errorMessage =
        "Foi atingido o limite de consultas. Por favor, aguarde um momento.";
      errorCode = "QUOTA_EXCEEDED";
    } else if (error.message?.includes("safety")) {
      statusCode = 400;
      errorMessage = "O conteúdo não cumpre com as políticas de segurança.";
      errorCode = "SAFETY_FILTER";
    } else if (error.message?.includes("API key")) {
      statusCode = 401;
      errorMessage = "Erro de autenticação com o serviço de IA.";
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("Resposta vazia")) {
      statusCode = 503;
      errorMessage =
        "O serviço não conseguiu gerar uma resposta. Por favor, tente novamente.";
      errorCode = "EMPTY_RESPONSE";
    } else if (
      error.message?.includes("Todos os modelos de IA não estão disponíveis")
    ) {
      statusCode = 503;
      errorMessage = error.message;
      errorCode = "ALL_MODELS_UNAVAILABLE";
    }

    const errorResponse: ChatResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }

  public getChineseZodiacInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        master: {
          name: "Astróloga Lua",
          title: "Guia Celestial dos Signos",
          specialty: "Astrologia ocidental e horóscopo personalizado",
          description:
            "Sábia astróloga especializada em interpretar as influências celestiais e a sabedoria dos doze signos zodiacais",
          services: [
            "Interpretação de signos zodiacais",
            "Análise de cartas astrais",
            "Predições horoscópicas",
            "Compatibilidades entre signos",
            "Conselhos baseados em astrologia",
          ],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}