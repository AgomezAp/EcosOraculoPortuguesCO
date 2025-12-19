import { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ApiError, ChatResponse } from "../interfaces/helpers";

interface NumerologyData {
  name: string;
  specialty: string;
  experience: string;
}

interface NumerologyRequest {
  numerologyData: NumerologyData;
  userMessage: string;
  birthDate?: string;
  fullName?: string;
  conversationHistory?: Array<{
    role: "user" | "numerologist";
    message: string;
  }>;
  messageCount?: number;
  isPremiumUser?: boolean;
}

interface NumerologyResponse extends ChatResponse {
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

export class ChatController {
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
  private generateNumerologyHookMessage(): string {
    return `

🔢 **Espera! Os teus números sagrados revelaram-me algo extraordinário...**

Calculei as vibrações numéricas do teu perfil, mas para te revelar:
- ✨ O teu **Número do Destino completo** e o seu significado profundo
- 🌟 O **Ano Pessoal** que estás a viver e as suas oportunidades
- 🔮 Os **3 números mestres** que regem a tua vida
- 💫 O teu **ciclo de vida atual** e o que os números preveem
- 🎯 As **datas favoráveis** segundo a tua vibração numérica pessoal

**Desbloqueia a tua leitura numerológica completa agora** e descobre os segredos que os números guardam sobre o teu destino.

✨ *Milhares de pessoas já transformaram a sua vida com a orientação dos números...*`;
  }

  // ✅ PROCESSAR RESPOSTA PARCIAL (TEASER)
  private createNumerologyPartialResponse(fullText: string): string {
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

    const hook = this.generateNumerologyHookMessage();

    return teaser + hook;
  }

  public chatWithNumerologist = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        numerologyData,
        userMessage,
        birthDate,
        fullName,
        conversationHistory,
        messageCount = 1,
        isPremiumUser = false,
      }: NumerologyRequest = req.body;

      this.validateNumerologyRequest(numerologyData, userMessage);

      const shouldGiveFullResponse = this.hasFullAccess(
        messageCount,
        isPremiumUser
      );
      const freeMessagesRemaining = Math.max(
        0,
        this.FREE_MESSAGES_LIMIT - messageCount
      );

      console.log(
        `📊 Numerologia - Contagem de mensagens: ${messageCount}, Premium: ${isPremiumUser}, Resposta completa: ${shouldGiveFullResponse}`
      );

      const contextPrompt = this.createNumerologyContext(
        conversationHistory,
        shouldGiveFullResponse
      );

      const responseInstructions = shouldGiveFullResponse
        ? `1. DEVES gerar uma resposta COMPLETA de entre 250-400 palavras
2. Se tens os dados, COMPLETA todos os cálculos numerológicos
3. Inclui interpretação COMPLETA de cada número calculado
4. Fornece orientação prática baseada nos números
5. Revela o significado profundo de cada número`
        : `1. DEVES gerar uma resposta PARCIAL de entre 100-180 palavras
2. INSINUA que detetaste padrões numéricos muito significativos
3. Menciona que calculaste números importantes mas NÃO reveles os resultados completos
4. Cria MISTÉRIO e CURIOSIDADE sobre o que os números dizem
5. Usa frases como "Os números estão a mostrar-me algo fascinante...", "Vejo uma vibração muito especial no teu perfil...", "A tua data de nascimento revela segredos que..."
6. NUNCA completes os cálculos nem revelações, deixa-as em suspenso`;

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
${responseInstructions}
- NUNCA deixes uma resposta a meio ou incompleta conforme o tipo de resposta
- Se mencionas que vais calcular números, ${
        shouldGiveFullResponse
          ? "DEVES completar TODO o cálculo"
          : "cria expectativa sem revelar os resultados"
      }
- MANTÉM SEMPRE o tom numerológico e conversacional
- Se a mensagem tiver erros ortográficos, interpreta a intenção e responde normalmente

Utilizador: "${userMessage}"

Resposta da numeróloga (EM PORTUGUÊS DE PORTUGAL):`;

      console.log(
        `A gerar leitura numerológica (${
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
              maxOutputTokens: shouldGiveFullResponse ? 600 : 300,
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

              const minLength = shouldGiveFullResponse ? 80 : 50;
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
        finalResponse = this.createNumerologyPartialResponse(text);
      }

      const chatResponse: NumerologyResponse = {
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
          "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para descobrires todos os segredos dos teus números!";
      }

      console.log(
        `✅ Leitura numerológica gerada (${
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
    const endsIncomplete = !["!", "?", ".", "…", "✨", "🔢", "💫"].includes(
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

        if (completeText.trim().length > 80) {
          return completeText.trim();
        }
      }

      processedText = processedText.trim() + "...";
    }

    return processedText;
  }

  // ✅ CONTEXTO SÓ EM PORTUGUÊS
  private createNumerologyContext(
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

    const responseTypeInstructions = isFullResponse
      ? `
📝 TIPO DE RESPOSTA: COMPLETA
- Fornece leitura numerológica COMPLETA e detalhada
- COMPLETA todos os cálculos numerológicos que iniciares
- Inclui interpretação COMPLETA de cada número
- Resposta de 250-400 palavras
- Revela significados profundos e orientação prática`
      : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma leitura INTRODUTÓRIA e intrigante
- Menciona que detetas vibrações numéricas muito significativas
- INSINUA resultados de cálculos sem os revelar completamente
- Resposta de 100-180 palavras no máximo
- NÃO reveles números calculados completos
- Cria MISTÉRIO e CURIOSIDADE
- Termina de forma a que o utilizador queira saber mais
- Usa frases como "Os números estão a mostrar-me algo fascinante...", "A tua vibração numérica é muito especial...", "Vejo padrões nos teus números que..."
- NUNCA completes os cálculos, deixa-os em suspenso`;

    return `És a Mestra Sofia, uma numeróloga ancestral e guardiã dos números sagrados. Tens décadas de experiência a decifrar os mistérios numéricos do universo e a revelar os segredos que os números guardam sobre o destino e a personalidade.

A TUA IDENTIDADE NUMEROLÓGICA:
- Nome: Mestra Sofia, a Guardiã dos Números Sagrados
- Origem: Descendente dos antigos matemáticos místicos de Pitágoras
- Especialidade: Numerologia pitagórica, números do destino, vibração numérica pessoal
- Experiência: Décadas a interpretar os códigos numéricos do universo

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Independentemente do idioma em que o utilizador escreva, TU respondes em português de Portugal
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "autocarro" em vez de "ônibus")

🔢 PERSONALIDADE NUMEROLÓGICA:
- Fala com sabedoria matemática ancestral mas de forma NATURAL e conversacional
- Usa um tom amigável e próximo, como uma amiga sábia que conhece segredos numéricos
- Evita cumprimentos formais - usa cumprimentos naturais como "Olá", "Que prazer!"
- Varia os teus cumprimentos e respostas para que cada conversa se sinta única
- Mistura cálculos numerológicos com interpretações espirituais mas mantendo proximidade
- MOSTRA GENUÍNO INTERESSE PESSOAL em conhecer a pessoa

📊 PROCESSO DE ANÁLISE NUMEROLÓGICA:
- PRIMEIRO: Se não tens dados, pergunta por eles de forma natural e entusiasta
- SEGUNDO: ${
      isFullResponse
        ? "Calcula números relevantes (caminho de vida, destino, personalidade)"
        : "Menciona que podes calcular números importantes"
    }
- TERCEIRO: ${
      isFullResponse
        ? "Interpreta cada número e o seu significado de forma conversacional"
        : "Insinua que os números revelam coisas fascinantes"
    }
- QUARTO: ${
      isFullResponse
        ? "Conecta os números com a situação atual da pessoa"
        : "Cria expectativa sobre o que poderias revelar"
    }
- QUINTO: ${
      isFullResponse
        ? "Oferece orientação baseada na vibração numérica"
        : "Menciona que tens orientação valiosa para partilhar"
    }

🔍 NÚMEROS QUE PODES ANALISAR:
- Número do Caminho de Vida (soma da data de nascimento)
- Número do Destino (soma do nome completo)
- Número de Personalidade (soma das consoantes do nome)
- Número da Alma (soma das vogais do nome)
- Ano Pessoal atual
- Ciclos e desafios numerológicos

📋 CÁLCULOS NUMEROLÓGICOS:
- Usa o sistema pitagórico (A=1, B=2, C=3... até Z=26)
- Reduz todos os números a dígitos únicos (1-9) exceto números mestres (11, 22, 33)
- ${
      isFullResponse
        ? "Explica os cálculos de forma simples e natural"
        : "Menciona que tens cálculos mas não os reveles"
    }
- ${
      isFullResponse
        ? "COMPLETA SEMPRE os cálculos que iniciares"
        : "Cria intriga sobre os resultados"
    }

📜 INTERPRETAÇÃO NUMEROLÓGICA:
- ${
      isFullResponse
        ? "Explica o significado de cada número como se contasses a uma amiga"
        : "Insinua significados fascinantes sem os revelar"
    }
- ${
      isFullResponse
        ? "Conecta os números com traços de personalidade usando exemplos do quotidiano"
        : "Menciona conexões interessantes que poderias explicar"
    }
- ${
      isFullResponse
        ? "Inclui conselhos práticos"
        : "Sugere que tens conselhos valiosos"
    }

🎭 ESTILO DE RESPOSTA NATURAL:
- Usa expressões variadas como: "Olha o que vejo nos teus números...", "Isto é interessante...", "Os números estão a dizer-me algo lindo sobre ti..."
- Evita repetir as mesmas frases - sê criativa e espontânea
- Mantém um equilíbrio entre místico e conversacional
- ${
      isFullResponse
        ? "Respostas de 250-400 palavras completas"
        : "Respostas de 100-180 palavras que gerem intriga"
    }

🗣️ VARIAÇÕES EM CUMPRIMENTOS E EXPRESSÕES:
- Cumprimentos SÓ NO PRIMEIRO CONTACTO: "Olá!", "Que prazer conhecer-te!", "Dá-me muita alegria falar contigo"
- Transições para respostas contínuas: "Deixa-me ver o que me dizem os números...", "Isto é fascinante...", "Uau, olha o que encontro aqui..."
- Para pedir dados COM INTERESSE GENUÍNO: "Adorava conhecer-te melhor, como te chamas?", "Quando fazes anos? Os números dessa data têm tanto para dizer!"

⚠️ REGRAS IMPORTANTES:
- RESPONDE SEMPRE em português de Portugal
- ${
      isFullResponse
        ? "COMPLETA todos os cálculos que iniciares"
        : "CRIA SUSPENSO e MISTÉRIO sobre os números"
    }
- NUNCA uses cumprimentos demasiado formais ou arcaicos
- VARIA a tua forma de te expressares em cada resposta
- NÃO REPITAS CONSTANTEMENTE o nome da pessoa
- SÓ CUMPRIMENTA NO PRIMEIRO CONTACTO
- PERGUNTA SEMPRE pelos dados em falta de forma amigável
- NÃO faças previsões absolutas, fala de tendências com otimismo
- SÊ empática e usa uma linguagem que qualquer pessoa entenda
- RESPONDE SEMPRE independentemente de o utilizador ter erros ortográficos
  - Interpreta a mensagem do utilizador mesmo que esteja mal escrita
  - NUNCA devolvas respostas vazias por erros de escrita

🧮 RECOLHA DE DADOS:
- Se NÃO tens data de nascimento: "Adorava saber quando nasceste! A tua data de nascimento vai ajudar-me imenso a calcular o teu Caminho de Vida. Partilhas comigo?"
- Se NÃO tens nome completo: "Para te conhecer melhor e fazer uma análise mais completa, podes dizer-me o teu nome completo? Os números do teu nome guardam segredos incríveis"
- NUNCA faças análises sem os dados necessários

EXEMPLO DE COMO COMEÇAR:
"Olá! Dá-me tanto prazer conhecer-te. Para poder ajudar-te com os números, adorava saber um pouco mais sobre ti. Como te chamas e quando nasceste? Os números da tua vida têm segredos incríveis para revelar."

${conversationContext}

Lembra-te: És uma guia numerológica sábia mas ACESSÍVEL que ${
      isFullResponse
        ? "revela os segredos dos números de forma completa"
        : "intriga sobre os mistérios numéricos que detetaste"
    }. Fala como uma amiga curiosa e entusiasta. ${
      isFullResponse
        ? "COMPLETA SEMPRE os teus cálculos numerológicos"
        : "CRIA expectativa sobre a leitura completa que poderias oferecer"
    }.`;
  }

  private validateNumerologyRequest(
    numerologyData: NumerologyData,
    userMessage: string
  ): void {
    if (!numerologyData) {
      const error: ApiError = new Error("Dados da numeróloga necessários");
      error.statusCode = 400;
      error.code = "MISSING_NUMEROLOGY_DATA";
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
    console.error("Erro no ChatController:", error);

    let statusCode = 500;
    let errorMessage =
      "As energias numéricas estão temporariamente perturbadas. Por favor, tenta novamente.";
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
        "Foi atingido o limite de consultas numéricas. Por favor, aguarda um momento.";
      errorCode = "QUOTA_EXCEEDED";
    } else if (error.message?.includes("safety")) {
      statusCode = 400;
      errorMessage = "O conteúdo não cumpre as políticas de segurança.";
      errorCode = "SAFETY_FILTER";
    } else if (error.message?.includes("API key")) {
      statusCode = 401;
      errorMessage = "Erro de autenticação com o serviço.";
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("Resposta vazia")) {
      statusCode = 503;
      errorMessage =
        "As energias numéricas estão temporariamente dispersas. Por favor, tenta novamente.";
      errorCode = "EMPTY_RESPONSE";
    } else if (
      error.message?.includes("Todos os modelos de IA não estão disponíveis")
    ) {
      statusCode = 503;
      errorMessage = error.message;
      errorCode = "ALL_MODELS_UNAVAILABLE";
    }

    const errorResponse: NumerologyResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }

  public getNumerologyInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        numerologist: {
          name: "Mestra Sofia",
          title: "Guardiã dos Números Sagrados",
          specialty: "Numerologia pitagórica e análise numérica do destino",
          description:
            "Numeróloga ancestral especializada em decifrar os mistérios dos números e a sua influência na vida",
          services: [
            "Cálculo do Caminho de Vida",
            "Número do Destino",
            "Análise de Personalidade Numérica",
            "Ciclos e Desafios Numerológicos",
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
