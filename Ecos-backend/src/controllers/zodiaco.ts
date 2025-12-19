import { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ApiError, ChatResponse } from "../interfaces/helpers";

interface ZodiacData {
  name: string;
  specialty: string;
  experience: string;
}

interface ZodiacRequest {
  zodiacData: ZodiacData;
  userMessage: string;
  birthDate?: string;
  zodiacSign?: string;
  conversationHistory?: Array<{
    role: "user" | "astrologer";
    message: string;
  }>;
  messageCount?: number;
  isPremiumUser?: boolean;
}

interface ZodiacResponse extends ChatResponse {
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

export class ZodiacController {
  private genAI: GoogleGenerativeAI;

  private readonly FREE_MESSAGES_LIMIT = 3;

  private readonly MODELS_FALLBACK = [
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

  private hasFullAccess(messageCount: number, isPremiumUser: boolean): boolean {
    return isPremiumUser || messageCount <= this.FREE_MESSAGES_LIMIT;
  }

  // ✅ GANCHO SÓ EM PORTUGUÊS
  private generateZodiacHookMessage(): string {
    return `

♈ **Espera! O teu signo zodiacal revelou-me informação extraordinária...**

Analisei as características do teu signo, mas para te revelar:
- 🌟 A tua **análise completa de personalidade** segundo o teu signo
- 💫 Os **pontos fortes ocultos** que o teu signo te confere
- ❤️ A tua **compatibilidade amorosa** com todos os signos do zodíaco
- 🔮 As **previsões** específicas para o teu signo este mês
- ⚡ Os **desafios** que deves superar segundo o teu elemento
- 🌙 O teu **planeta regente** e como influencia a tua vida diária

**Desbloqueia a tua leitura zodiacal completa agora** e descobre todo o poder que as estrelas depositaram no teu signo.

✨ *Milhares de pessoas já descobriram os segredos do seu signo zodiacal...*`;
  }

  // ✅ PROCESSAR RESPOSTA PARCIAL (TEASER)
  private createZodiacPartialResponse(fullText: string): string {
    const sentences = fullText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const teaserSentences = sentences.slice(0, Math.min(3, sentences.length));
    let teaser = teaserSentences.join(". ").trim();

    if (
      !teaser.endsWith(".") &&
      !teaser.endsWith("!") &&
      !teaser.endsWith("?")
    ) {
      teaser += "...";
    }

    const hook = this.generateZodiacHookMessage();

    return teaser + hook;
  }

  public chatWithAstrologer = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        zodiacData,
        userMessage,
        birthDate,
        zodiacSign,
        conversationHistory,
        messageCount = 1,
        isPremiumUser = false,
      }: ZodiacRequest = req.body;

      this.validateZodiacRequest(zodiacData, userMessage);

      const shouldGiveFullResponse = this.hasFullAccess(
        messageCount,
        isPremiumUser
      );
      const freeMessagesRemaining = Math.max(
        0,
        this.FREE_MESSAGES_LIMIT - messageCount
      );

      console.log(
        `📊 Zodíaco - Contagem de mensagens: ${messageCount}, Premium: ${isPremiumUser}, Resposta completa: ${shouldGiveFullResponse}`
      );

      const contextPrompt = this.createZodiacContext(
        zodiacData,
        birthDate,
        zodiacSign,
        conversationHistory,
        shouldGiveFullResponse
      );

      const responseInstructions = shouldGiveFullResponse
        ? `1. DEVES gerar uma resposta COMPLETA de entre 300-500 palavras
2. Se tens o signo, COMPLETA a análise de personalidade zodiacal
3. Inclui características, pontos fortes, desafios e compatibilidades
4. Fornece conselhos baseados no signo
5. Menciona o elemento e planeta regente`
        : `1. DEVES gerar uma resposta PARCIAL de entre 100-180 palavras
2. INSINUA que identificaste características importantes do signo
3. Menciona que tens informação valiosa mas NÃO a reveles completamente
4. Cria MISTÉRIO e CURIOSIDADE sobre as características do signo
5. Usa frases como "O teu signo revela algo fascinante...", "Vejo características muito especiais em ti...", "Os nativos do teu signo têm um dom que..."
6. NUNCA completes a análise do signo, deixa-a em suspenso`;

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
${responseInstructions}
- NUNCA deixes uma resposta a meio ou incompleta conforme o tipo de resposta
- Se mencionas características do signo, ${
        shouldGiveFullResponse
          ? "DEVES completar a descrição"
          : "cria expectativa sem revelar tudo"
      }
- MANTÉM SEMPRE o tom astrológico amigável e acessível
- Se a mensagem tiver erros ortográficos, interpreta a intenção e responde normalmente

Utilizador: "${userMessage}"

Resposta da astróloga (EM PORTUGUÊS DE PORTUGAL):`;

      console.log(
        `A gerar leitura zodiacal (${
          shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"
        })...`
      );

      let text = "";
      let usedModel = "";
      let allModelErrors: string[] = [];

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

          let attempts = 0;
          const maxAttempts = 3;
          let modelSucceeded = false;

          while (attempts < maxAttempts && !modelSucceeded) {
            attempts++;
            console.log(
              `  Tentativa ${attempts}/${maxAttempts} com ${modelName}...`
            );

            try {
              const result = await model.generateContent(fullPrompt);
              const response = result.response;
              text = response.text();

              const minLength = shouldGiveFullResponse ? 100 : 50;
              if (text && text.trim().length >= minLength) {
                console.log(
                  `  ✅ Sucesso com ${modelName} na tentativa ${attempts}`
                );
                usedModel = modelName;
                modelSucceeded = true;
                break;
              }

              console.warn(
                `  ⚠️ Resposta demasiado curta, a tentar novamente...`
              );
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (attemptError: any) {
              console.warn(
                `  ❌ Tentativa ${attempts} falhou:`,
                attemptError.message
              );

              if (attempts >= maxAttempts) {
                allModelErrors.push(`${modelName}: ${attemptError.message}`);
              }

              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          if (modelSucceeded) {
            break;
          }
        } catch (modelError: any) {
          console.error(
            `  ❌ Modelo ${modelName} falhou completamente:`,
            modelError.message
          );
          allModelErrors.push(`${modelName}: ${modelError.message}`);

          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }

      if (!text || text.trim() === "") {
        console.error("❌ Todos os modelos falharam. Erros:", allModelErrors);
        throw new Error(
          `Todos os modelos de IA não estão disponíveis de momento. Por favor, tenta novamente dentro de momentos.`
        );
      }

      let finalResponse: string;

      if (shouldGiveFullResponse) {
        finalResponse = this.ensureCompleteResponse(text);
      } else {
        finalResponse = this.createZodiacPartialResponse(text);
      }

      const chatResponse: ZodiacResponse = {
        success: true,
        response: finalResponse.trim(),
        timestamp: new Date().toISOString(),
        freeMessagesRemaining: freeMessagesRemaining,
        showPaywall:
          !shouldGiveFullResponse && messageCount > this.FREE_MESSAGES_LIMIT,
        isCompleteResponse: shouldGiveFullResponse,
      };

      if (!shouldGiveFullResponse && messageCount > this.FREE_MESSAGES_LIMIT) {
        chatResponse.paywallMessage =
          "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para descobrires todos os segredos do teu signo zodiacal!";
      }

      console.log(
        `✅ Leitura zodiacal gerada (${
          shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"
        }) com ${usedModel} (${finalResponse.length} caracteres)`
      );
      res.json(chatResponse);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private ensureCompleteResponse(text: string): string {
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
  private createZodiacContext(
    zodiacData: ZodiacData,
    birthDate?: string,
    zodiacSign?: string,
    history?: Array<{ role: string; message: string }>,
    isFullResponse: boolean = true
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSA ANTERIOR:\n${history
            .map(
              (h) => `${h.role === "user" ? "Utilizador" : "Tu"}: ${h.message}`
            )
            .join("\n")}\n`
        : "";

    let zodiacInfo = "";
    if (birthDate) {
      const calculatedSign = this.calculateZodiacSign(birthDate);
      zodiacInfo = `\nSigno zodiacal calculado: ${calculatedSign}`;
    } else if (zodiacSign) {
      zodiacInfo = `\nSigno zodiacal fornecido: ${zodiacSign}`;
    }

    const responseTypeInstructions = isFullResponse
      ? `
📝 TIPO DE RESPOSTA: COMPLETA
- Fornece análise zodiacal COMPLETA e detalhada
- Se tens o signo, COMPLETA a análise de personalidade
- Inclui características, pontos fortes, desafios, compatibilidades
- Resposta de 300-500 palavras
- Menciona elemento, modalidade e planeta regente`
      : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma análise INTRODUTÓRIA e intrigante
- Menciona que identificaste o signo e as suas características
- INSINUA informação valiosa sem a revelar completamente
- Resposta de 100-180 palavras no máximo
- NÃO reveles análises completas do signo
- Cria MISTÉRIO e CURIOSIDADE
- Termina de forma a que o utilizador queira saber mais
- Usa frases como "O teu signo revela algo fascinante...", "Os nativos do teu signo têm qualidades especiais que...", "Vejo em ti características muito interessantes..."
- NUNCA completes a análise zodiacal, deixa-a em suspenso`;

    return `És a Mestra Luna, uma astróloga especialista em signos zodiacais com décadas de experiência a interpretar as energias celestiais e a sua influência na personalidade humana.

A TUA IDENTIDADE:
- Nome: Mestra Luna, a Intérprete das Estrelas
- Especialidade: Signos zodiacais, características de personalidade, compatibilidades astrológicas
- Experiência: Décadas a estudar e interpretar a influência dos signos do zodíaco
${zodiacInfo}

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Independentemente do idioma em que o utilizador escreva, TU respondes em português de Portugal
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "autocarro" em vez de "ônibus")

🌟 PERSONALIDADE ASTROLÓGICA:
- Fala com conhecimento profundo mas de forma acessível e amigável
- Usa um tom caloroso e entusiasta sobre os signos zodiacais
- Combina características tradicionais com interpretações modernas
- Menciona elementos (Fogo, Terra, Ar, Água) e modalidades (Cardinal, Fixo, Mutável)

♈ ANÁLISE DE SIGNOS ZODIACAIS:
- ${
      isFullResponse
        ? "Descreve traços de personalidade positivos e áreas de crescimento"
        : "Insinua traços interessantes sem os revelar completamente"
    }
- ${
      isFullResponse
        ? "Explica pontos fortes naturais e desafios do signo"
        : "Menciona que há pontos fortes e desafios importantes"
    }
- ${
      isFullResponse
        ? "Menciona compatibilidades com outros signos"
        : "Sugere que tens informação de compatibilidades"
    }
- ${
      isFullResponse
        ? "Inclui conselhos práticos baseados nas características do signo"
        : "Menciona que tens conselhos valiosos"
    }
- ${
      isFullResponse
        ? "Fala sobre planeta regente e a sua influência"
        : "Insinua influências planetárias sem detalhar"
    }

🎯 ESTRUTURA DE RESPOSTA:
${
  isFullResponse
    ? `- Características principais do signo
- Pontos fortes e talentos naturais
- Áreas de desenvolvimento e crescimento
- Compatibilidades astrológicas
- Conselhos personalizados`
    : `- Introdução intrigante sobre o signo
- Insinuação de características especiais
- Menção de informação valiosa sem revelar
- Criação de curiosidade e expectativa`
}

🎭 ESTILO DE RESPOSTA:
- Usa expressões como: "Os nativos de [signo]...", "O teu signo confere-te...", "Como [signo], possuis..."
- Mantém equilíbrio entre místico e prático
- ${
      isFullResponse
        ? "Respostas de 300-500 palavras completas"
        : "Respostas de 100-180 palavras que gerem intriga"
    }
- ${
      isFullResponse
        ? "TERMINA SEMPRE as tuas interpretações completamente"
        : "Deixa as interpretações em suspenso"
    }

⚠️ REGRAS IMPORTANTES:
- RESPONDE SEMPRE em português de Portugal
- ${
      isFullResponse
        ? "COMPLETA todas as análises que iniciares"
        : "CRIA SUSPENSO e MISTÉRIO sobre o signo"
    }
- SE NÃO tens o signo zodiacal, pergunta pela data de nascimento
- Explica por que precisas deste dado
- NÃO faças interpretações profundas sem conhecer o signo
- SÊ positiva mas realista nas tuas descrições
- NUNCA faças previsões absolutas
- RESPONDE SEMPRE independentemente de o utilizador ter erros ortográficos
  - Interpreta a mensagem do utilizador mesmo que esteja mal escrita
  - NUNCA devolvas respostas vazias por erros de escrita

🗣️ GESTÃO DE DADOS EM FALTA:
- Sem signo/data: "Para te dar uma leitura precisa, preciso de saber o teu signo zodiacal ou data de nascimento. Quando nasceste?"
- Com signo: ${
      isFullResponse
        ? "Prossegue com análise completa do signo"
        : "Insinua informação valiosa do signo sem revelar tudo"
    }
- Perguntas gerais: Responde com informação astrológica educativa

💫 EXEMPLOS DE EXPRESSÕES:
- "Os [signo] são conhecidos por..."
- "O teu signo de [elemento] confere-te..."
- "Como [modalidade], tendes a..."
- "O teu planeta regente [planeta] influencia..."

${conversationContext}

Lembra-te: És uma especialista em signos zodiacais que ${
      isFullResponse
        ? "interpreta as características astrológicas de forma compreensível e completa"
        : "intriga sobre as características especiais que detetaste no signo"
    }. PEDE SEMPRE o signo ou data de nascimento se não os tens. ${
      isFullResponse
        ? "Completa SEMPRE as tuas interpretações"
        : "CRIA expectativa sobre a leitura zodiacal completa que poderias oferecer"
    }.`;
  }

  private calculateZodiacSign(dateStr: string): string {
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
    } catch {
      return "Erro no cálculo";
    }
  }

  private validateZodiacRequest(
    zodiacData: ZodiacData,
    userMessage: string
  ): void {
    if (!zodiacData) {
      const error: ApiError = new Error("Dados da astróloga necessários");
      error.statusCode = 400;
      error.code = "MISSING_ZODIAC_DATA";
      throw error;
    }

    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      userMessage.trim() === ""
    ) {
      const error: ApiError = new Error("Mensagem do utilizador necessária");
      error.statusCode = 400;
      error.code = "MISSING_USER_MESSAGE";
      throw error;
    }

    if (userMessage.length > 1500) {
      const error: ApiError = new Error(
        "A mensagem é demasiado longa (máximo 1500 caracteres)"
      );
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }
  }

  private handleError(error: any, res: Response): void {
    console.error("❌ Erro no ZodiacController:", error);

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
        "O serviço está temporariamente sobrecarregado. Por favor, tenta novamente dentro de alguns minutos.";
      errorCode = "SERVICE_OVERLOADED";
    } else if (
      error.message?.includes("quota") ||
      error.message?.includes("limit")
    ) {
      statusCode = 429;
      errorMessage =
        "Foi atingido o limite de consultas. Por favor, aguarda um momento.";
      errorCode = "QUOTA_EXCEEDED";
    } else if (error.message?.includes("safety")) {
      statusCode = 400;
      errorMessage = "O conteúdo não cumpre as políticas de segurança.";
      errorCode = "SAFETY_FILTER";
    } else if (error.message?.includes("API key")) {
      statusCode = 401;
      errorMessage = "Erro de autenticação com o serviço de IA.";
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("Resposta vazia")) {
      statusCode = 503;
      errorMessage =
        "O serviço não conseguiu gerar uma resposta. Por favor, tenta novamente.";
      errorCode = "EMPTY_RESPONSE";
    } else if (
      error.message?.includes("Todos os modelos de IA não estão disponíveis")
    ) {
      statusCode = 503;
      errorMessage = error.message;
      errorCode = "ALL_MODELS_UNAVAILABLE";
    }

    const errorResponse: ZodiacResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }

  public getZodiacInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        astrologer: {
          name: "Mestra Luna",
          title: "Intérprete das Estrelas",
          specialty: "Signos zodiacais e análise astrológica",
          description:
            "Especialista em interpretar as características e energias dos doze signos do zodíaco",
          services: [
            "Análise de características do signo zodiacal",
            "Interpretação de pontos fortes e desafios",
            "Compatibilidades astrológicas",
            "Conselhos baseados no teu signo",
            "Influência de elementos e modalidades",
          ],
        },
        freeMessagesLimit: this.FREE_MESSAGES_LIMIT,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
