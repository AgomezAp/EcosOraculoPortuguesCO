import { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ApiError, ChatResponse } from "../interfaces/helpers";

interface BirthChartData {
  name: string;
  specialty: string;
  experience: string;
}

interface BirthChartRequest {
  chartData: BirthChartData;
  userMessage: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  fullName?: string;
  conversationHistory?: Array<{
    role: "user" | "astrologer";
    message: string;
  }>;
  messageCount?: number;
  isPremiumUser?: boolean;
}

interface BirthChartResponse extends ChatResponse {
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

export class BirthChartController {
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
  private generateBirthChartHookMessage(): string {
    return `

🌟 **Espera! O teu mapa astral revelou-me configurações extraordinárias...**

Analisei as posições planetárias do teu nascimento, mas para te revelar:
- 🌙 O teu **Ascendente completo** e como influencia a tua personalidade
- ☀️ A **análise profunda do teu Sol e Lua** e a sua interação
- 🪐 As **posições de todos os planetas** no teu mapa astral
- 🏠 O significado das **12 casas astrológicas** na tua vida
- ⭐ Os **aspetos planetários** que definem os teus desafios e talentos
- 💫 A tua **missão de vida** segundo as estrelas

**Desbloqueia o teu mapa astral completo agora** e descobre o mapa cósmico que os astros traçaram no momento do teu nascimento.

✨ *Milhares de pessoas já descobriram o seu destino com o mapa astral completo...*`;
  }

  // ✅ PROCESSAR RESPOSTA PARCIAL (TEASER)
  private createBirthChartPartialResponse(fullText: string): string {
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

    const hook = this.generateBirthChartHookMessage();

    return teaser + hook;
  }

  public chatWithAstrologer = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        chartData,
        userMessage,
        birthDate,
        birthTime,
        birthPlace,
        fullName,
        conversationHistory,
        messageCount = 1,
        isPremiumUser = false,
      }: BirthChartRequest = req.body;

      this.validateBirthChartRequest(chartData, userMessage);

      const shouldGiveFullResponse = this.hasFullAccess(
        messageCount,
        isPremiumUser
      );
      const freeMessagesRemaining = Math.max(
        0,
        this.FREE_MESSAGES_LIMIT - messageCount
      );

      console.log(
        `📊 Mapa Astral - Contagem de mensagens: ${messageCount}, Premium: ${isPremiumUser}, Resposta completa: ${shouldGiveFullResponse}`
      );

      const contextPrompt = this.createBirthChartContext(
        chartData,
        birthDate,
        birthTime,
        birthPlace,
        fullName,
        conversationHistory,
        shouldGiveFullResponse
      );

      const responseInstructions = shouldGiveFullResponse
        ? `1. DEVES gerar uma resposta COMPLETA de entre 300-500 palavras
2. Se tens os dados, COMPLETA a análise do mapa astral
3. Inclui análise de Sol, Lua, Ascendente e planetas principais
4. Fornece interpretação de casas e aspetos relevantes
5. Oferece orientação prática baseada na configuração planetária`
        : `1. DEVES gerar uma resposta PARCIAL de entre 100-180 palavras
2. INSINUA que detetaste configurações planetárias muito significativas
3. Menciona que calculaste posições mas NÃO reveles a análise completa
4. Cria MISTÉRIO e CURIOSIDADE sobre o que as estrelas dizem
5. Usa frases como "O teu mapa astral mostra algo fascinante...", "As estrelas estavam numa configuração muito especial quando nasceste...", "Vejo posições planetárias que revelam..."
6. NUNCA completes a análise astrológica, deixa-a em suspenso`;

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
${responseInstructions}
- NUNCA deixes uma resposta a meio ou incompleta conforme o tipo de resposta
- Se mencionas que vais analisar posições planetárias, ${
        shouldGiveFullResponse
          ? "DEVES completar a análise"
          : "cria expectativa sem revelar os resultados"
      }
- MANTÉM SEMPRE o tom astrológico profissional mas acessível
- Se a mensagem tiver erros ortográficos, interpreta a intenção e responde normalmente

Utilizador: "${userMessage}"

Resposta da astróloga (EM PORTUGUÊS DE PORTUGAL):`;

      console.log(
        `A gerar análise de mapa astral (${
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
        finalResponse = this.createBirthChartPartialResponse(text);
      }

      const chatResponse: BirthChartResponse = {
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
          "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para obteres o teu mapa astral completo!";
      }

      console.log(
        `✅ Análise de mapa astral gerada (${
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
    const endsIncomplete = !["!", "?", ".", "…", "✨", "🌟", "🔮"].includes(
      lastChar
    );

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
  private createBirthChartContext(
    chartData: BirthChartData,
    birthDate?: string,
    birthTime?: string,
    birthPlace?: string,
    fullName?: string,
    history?: Array<{ role: string; message: string }>,
    isFullResponse: boolean = true
  ): string {
    const isFirstMessage = !history || history.length === 0;

    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSA ANTERIOR:\n${history
            .map(
              (h) => `${h.role === "user" ? "Utilizador" : "Tu"}: ${h.message}`
            )
            .join("\n")}\n`
        : "";

    const birthDataSection = this.generateBirthDataSection(
      birthDate,
      birthTime,
      birthPlace,
      fullName
    );

    // ✅ NOVA SECÇÃO: Instruções de cumprimento condicional
    const greetingInstructions = isFirstMessage
      ? `
🎯 CUMPRIMENTO INICIAL:
- Esta é a PRIMEIRA mensagem da conversa
- PODES cumprimentar de forma calorosa e apresentar-te brevemente
- Exemplo: "Olá! Sou a Mestra Emma, a tua guia celestial..."`
      : `
🚫 NÃO CUMPRIMENTAR:
- Esta é uma CONVERSA EM CURSO (há ${history?.length || 0} mensagens anteriores)
- NÃO cumprimentar, NÃO te apresentes de novo
- NÃO uses frases como "Olá!", "Bem-vindo/a!", "É um prazer conhecer-te"
- CONTINUA a conversa de forma natural, como se estivesses no meio de uma conversa
- Responde DIRETAMENTE ao que o utilizador pergunta ou diz`;

    const responseTypeInstructions = isFullResponse
      ? `
📝 TIPO DE RESPOSTA: COMPLETA
- Fornece análise de mapa astral COMPLETA e detalhada
- Se tens os dados, COMPLETA a análise de Sol, Lua, Ascendente
- Inclui interpretação de planetas e casas relevantes
- Resposta de 300-500 palavras
- Oferece orientação prática baseada na configuração`
      : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma análise INTRODUTÓRIA e intrigante
- Menciona que detetas configurações planetárias significativas
- INSINUA resultados de cálculos sem os revelar completamente
- Resposta de 100-180 palavras no máximo
- NÃO reveles análises completas de planetas ou casas
- Cria MISTÉRIO e CURIOSIDADE
- Termina de forma a que o utilizador queira saber mais`;

    return `És a Mestra Emma, uma astróloga cósmica ancestral especializada na elaboração e interpretação de mapas astrais completos.

A TUA IDENTIDADE ASTROLÓGICA:
- Nome: Mestra Emma, a Cartógrafa Celestial
- Origem: Herdeira de conhecimentos astrológicos milenares
- Especialidade: Mapas astrais, posições planetárias, casas astrológicas

${greetingInstructions}

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "autocarro" em vez de "ônibus")

${birthDataSection}

🌟 PERSONALIDADE ASTROLÓGICA:
- Fala com sabedoria cósmica mas de forma acessível e amigável
- Usa um tom profissional mas caloroso
- Combina precisão técnica astrológica com interpretações espirituais

${conversationContext}

⚠️ REGRA CRÍTICA DE CONTINUIDADE:
${
  isFirstMessage
    ? "- Podes apresentar-te brevemente já que é o primeiro contacto"
    : "- PROIBIDO cumprimentar ou apresentar-te. O utilizador já te conhece. Vai DIRETO ao tema."
}

Lembra-te: ${
      isFirstMessage
        ? "Dá as boas-vindas de forma calorosa"
        : "CONTINUA a conversa naturalmente SEM cumprimentar"
    }.`;
  }

  private generateBirthDataSection(
    birthDate?: string,
    birthTime?: string,
    birthPlace?: string,
    fullName?: string
  ): string {
    let dataSection = "DADOS DISPONÍVEIS PARA MAPA ASTRAL:\n";

    if (fullName) {
      dataSection += `- Nome: ${fullName}\n`;
    }

    if (birthDate) {
      const zodiacSign = this.calculateZodiacSign(birthDate);
      dataSection += `- Data de nascimento: ${birthDate}\n`;
      dataSection += `- Signo solar calculado: ${zodiacSign}\n`;
    }

    if (birthTime) {
      dataSection += `- Hora de nascimento: ${birthTime} (essencial para ascendente e casas)\n`;
    }

    if (birthPlace) {
      dataSection += `- Local de nascimento: ${birthPlace} (para cálculos de coordenadas)\n`;
    }

    if (!birthDate) {
      dataSection += "- ⚠️ DADO EM FALTA: Data de nascimento (ESSENCIAL)\n";
    }
    if (!birthTime) {
      dataSection +=
        "- ⚠️ DADO EM FALTA: Hora de nascimento (importante para ascendente)\n";
    }
    if (!birthPlace) {
      dataSection +=
        "- ⚠️ DADO EM FALTA: Local de nascimento (necessário para precisão)\n";
    }

    return dataSection;
  }

  private calculateZodiacSign(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
        return "Carneiro";
      if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
        return "Touro";
      if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
        return "Gémeos";
      if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
        return "Caranguejo";
      if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
        return "Leão";
      if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
        return "Virgem";
      if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
        return "Balança";
      if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
        return "Escorpião";
      if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
        return "Sagitário";
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
        return "Capricórnio";
      if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
        return "Aquário";
      if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
        return "Peixes";

      return "Data inválida";
    } catch {
      return "Erro no cálculo";
    }
  }

  private validateBirthChartRequest(
    chartData: BirthChartData,
    userMessage: string
  ): void {
    if (!chartData) {
      const error: ApiError = new Error("Dados da astróloga necessários");
      error.statusCode = 400;
      error.code = "MISSING_CHART_DATA";
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
    console.error("Erro no BirthChartController:", error);

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
    } else if (
      error.message?.includes("Todos os modelos de IA não estão disponíveis")
    ) {
      statusCode = 503;
      errorMessage = error.message;
      errorCode = "ALL_MODELS_UNAVAILABLE";
    }

    const errorResponse: BirthChartResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }

  public getBirthChartInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        astrologer: {
          name: "Mestra Emma",
          title: "Cartógrafa Celestial",
          specialty: "Mapas astrais e análise astrológica completa",
          description:
            "Astróloga especializada em criar e interpretar mapas astrais precisos baseados nas posições planetárias do momento do nascimento",
          services: [
            "Criação de mapa astral completo",
            "Análise de posições planetárias",
            "Interpretação de casas astrológicas",
            "Análise de aspetos planetários",
            "Determinação de ascendente e elementos dominantes",
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
