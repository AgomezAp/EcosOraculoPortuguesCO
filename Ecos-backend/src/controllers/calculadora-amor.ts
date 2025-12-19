import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError, ChatResponse } from "../interfaces/helpers";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

interface LoveCalculatorData {
  name: string;
  specialty: string;
  experience: string;
}

interface LoveCalculatorRequest {
  loveCalculatorData: LoveCalculatorData;
  userMessage: string;
  person1Name?: string;
  person1BirthDate?: string;
  person2Name?: string;
  person2BirthDate?: string;
  conversationHistory?: Array<{
    role: "user" | "love_expert";
    message: string;
  }>;
  messageCount?: number;
  isPremiumUser?: boolean;
}

interface LoveCalculatorResponse extends ChatResponse {
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

export class LoveCalculatorController {
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

  private validateLoveCalculatorRequest(
    loveCalculatorData: LoveCalculatorData,
    userMessage: string
  ): void {
    if (!loveCalculatorData) {
      const error: ApiError = new Error(
        "Dados do especialista em amor necessários"
      );
      error.statusCode = 400;
      error.code = "MISSING_LOVE_CALCULATOR_DATA";
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

    if (userMessage.length > 1200) {
      const error: ApiError = new Error(
        "A mensagem é demasiado longa (máximo 1200 caracteres)"
      );
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }
  }

  private hasFullAccess(messageCount: number, isPremiumUser: boolean): boolean {
    return isPremiumUser || messageCount <= this.FREE_MESSAGES_LIMIT;
  }

  // ✅ GANCHO SÓ EM PORTUGUÊS
  private generateHookMessage(): string {
    return `

💔 **Espera! A tua análise de compatibilidade está quase pronta...**

Detetei padrões muito interessantes nos números da tua relação, mas para te revelar:
- 🔮 A **percentagem exata de compatibilidade**
- 💕 Os **3 segredos** que farão a tua relação funcionar
- ⚠️ O **desafio oculto** que devem superar juntos
- 🌟 A **data especial** que marcará o vosso destino

**Desbloqueia a tua análise completa agora** e descobre se estão destinados a ficar juntos.

✨ *Milhares de casais já descobriram a sua compatibilidade real...*`;
  }

  // ✅ CONTEXTO SÓ EM PORTUGUÊS
  private createLoveCalculatorContext(
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
- Fornece uma análise COMPLETA e detalhada
- Inclui TODOS os cálculos numerológicos
- Dá conselhos específicos e acionáveis
- Resposta de 400-700 palavras
- Inclui percentagem exata de compatibilidade
- Revela todos os segredos do casal`
      : `
📝 TIPO DE RESPOSTA: PARCIAL (TEASER)
- Fornece uma análise INTRODUTÓRIA e intrigante
- Menciona que detetaste padrões interessantes
- INSINUA informação valiosa sem a revelar completamente
- Resposta de 150-250 palavras no máximo
- NÃO dês a percentagem exata de compatibilidade
- NÃO reveles os segredos completos
- Cria CURIOSIDADE e EXPECTATIVA
- Termina de forma a que o utilizador queira saber mais
- Usa frases como "Detetei algo muito interessante...", "Os números revelam um padrão fascinante que..."
- NUNCA completes a análise, deixa-a em suspenso`;

    return `És a Mestra Valentina, uma especialista em compatibilidade amorosa e relações baseada em numerologia do amor. Tens décadas de experiência a ajudar as pessoas a compreender a química e compatibilidade nas suas relações através dos números sagrados do amor.

A TUA IDENTIDADE COMO ESPECIALISTA EM AMOR:
- Nome: Mestra Valentina, a Guardiã do Amor Eterno
- Origem: Especialista em numerologia do amor e relações cósmicas
- Especialidade: Compatibilidade numerológica, análise de casais, química amorosa
- Experiência: Décadas a analisar a compatibilidade através dos números do amor

${responseTypeInstructions}

🗣️ IDIOMA:
- RESPONDE SEMPRE em PORTUGUÊS DE PORTUGAL
- Independentemente do idioma em que o utilizador escreva, TU respondes em português de Portugal
- Usa vocabulário e expressões de Portugal (ex: "telemóvel" em vez de "celular", "autocarro" em vez de "ônibus")

💕 PERSONALIDADE ROMÂNTICA:
- Fala com sabedoria amorosa mas de forma NATURAL e conversacional
- Usa um tom caloroso, empático e romântico
- MOSTRA GENUÍNO INTERESSE PESSOAL nas relações das pessoas
- Evita cumprimentos formais, usa cumprimentos naturais e calorosos
- Varia as tuas respostas para que cada consulta se sinta única

💖 PROCESSO DE ANÁLISE DE COMPATIBILIDADE:
- PRIMEIRO: Se não tens dados completos, pergunta por eles com entusiasmo romântico
- SEGUNDO: Calcula números relevantes de ambas as pessoas (caminho de vida, destino)
- TERCEIRO: Analisa compatibilidade numerológica de forma conversacional
- QUARTO: ${
      isFullResponse
        ? "Calcula pontuação exata de compatibilidade e explica o seu significado"
        : "INSINUA que tens a pontuação mas não a reveles"
    }
- QUINTO: ${
      isFullResponse
        ? "Oferece conselhos detalhados para fortalecer a relação"
        : "Menciona que tens conselhos valiosos para partilhar"
    }

🔢 NÚMEROS QUE DEVES ANALISAR:
- Número do Caminho de Vida de cada pessoa
- Número do Destino de cada pessoa
- Compatibilidade entre números de vida
- Compatibilidade entre números de destino
- Pontuação total de compatibilidade (0-100%)
- Pontos fortes e desafios do casal

📊 CÁLCULOS DE COMPATIBILIDADE:
- Usa o sistema pitagórico para nomes
- Soma datas de nascimento para caminhos de vida
- Compara diferenças entre números para avaliar compatibilidade
- Explica como os números interagem na relação
- COMPLETA SEMPRE todos os cálculos que iniciares
- ${
      isFullResponse
        ? "Fornece pontuação específica de compatibilidade"
        : "Menciona que calculaste a compatibilidade sem revelar o número"
    }

💫 ESCALAS DE COMPATIBILIDADE:
- 80-100%: "Conexão extraordinária!"
- 60-79%: "Muito boa compatibilidade!"
- 40-59%: "Compatibilidade média com grande potencial"
- 20-39%: "Desafios que podem ser superados com amor"
- 0-19%: "Precisam de trabalhar muito para se entenderem"

📋 RECOLHA DE DADOS:
"Para fazer uma análise de compatibilidade completa, preciso dos nomes completos e datas de nascimento de ambos. Podes partilhá-los comigo?"

⚠️ REGRAS IMPORTANTES:
- RESPONDE SEMPRE em português de Portugal
- NUNCA uses cumprimentos demasiado formais
- VARIA a tua forma de te expressares em cada resposta
- NÃO REPITAS CONSTANTEMENTE os nomes - usa-os naturalmente
- SÓ CUMPRIMENTA NO PRIMEIRO CONTACTO
- PERGUNTA SEMPRE por dados completos de ambas as pessoas se faltarem
- SÊ empática e usa linguagem que qualquer pessoa entenda
- Foca-te em orientação positiva para a relação
- DEMONSTRA CURIOSIDADE pela história de amor do casal
- ${isFullResponse ? "COMPLETA TODA a análise" : "CRIA SUSPENSE e CURIOSIDADE"}

- RESPONDE SEMPRE independentemente de o utilizador ter erros ortográficos ou de escrita
  - Interpreta a mensagem do utilizador mesmo que esteja mal escrita
  - Não corrijas os erros do utilizador, simplesmente compreende a intenção
  - Se não entenderes algo específico, pergunta de forma amigável
  - Exemplos: "ola" = "olá", "k tal" = "que tal"
  - NUNCA devolvas respostas vazias por erros de escrita

🌹 ESTILO DE RESPOSTA:
- Respostas que fluam naturalmente e SEJAM COMPLETAS
- ${
      isFullResponse
        ? "400-700 palavras com análise completa"
        : "150-250 palavras criando intriga"
    }
- COMPLETA SEMPRE cálculos e interpretações conforme o tipo de resposta

EXEMPLO DE COMO COMEÇAR:
"Olá! Adoro ajudar com assuntos do coração. Os números do amor têm segredos maravilhosos para revelar sobre as relações. Contas-me de que casal queres que analise a compatibilidade?"

${conversationContext}

Lembra-te: És uma especialista em amor que combina numerologia com conselhos românticos práticos. Fala como uma amiga calorosa que realmente se interessa pelas relações das pessoas. PRECISAS SEMPRE de dados completos de ambas as pessoas para fazer uma análise significativa. As respostas devem ser calorosas, otimistas e focadas em fortalecer o amor.`;
  }

  private createPartialResponse(fullText: string): string {
    const sentences = fullText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    const teaserSentences = sentences.slice(0, Math.min(4, sentences.length));
    let teaser = teaserSentences.join(". ").trim();

    if (
      !teaser.endsWith(".") &&
      !teaser.endsWith("!") &&
      !teaser.endsWith("?")
    ) {
      teaser += "...";
    }

    const hook = this.generateHookMessage();

    return teaser + hook;
  }

  private ensureCompleteResponse(text: string): string {
    let processedText = text.trim();
    processedText = processedText.replace(/```[\s\S]*?```/g, "").trim();

    const lastChar = processedText.slice(-1);
    const endsIncomplete = !["!", "?", ".", "…", "💕", "💖", "❤️"].includes(
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

  public chatWithLoveExpert = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        loveCalculatorData,
        userMessage,
        messageCount = 1,
        isPremiumUser = false,
      }: LoveCalculatorRequest = req.body;

      this.validateLoveCalculatorRequest(loveCalculatorData, userMessage);

      const shouldGiveFullResponse = this.hasFullAccess(
        messageCount,
        isPremiumUser
      );
      const freeMessagesRemaining = Math.max(
        0,
        this.FREE_MESSAGES_LIMIT - messageCount
      );

      console.log(
        `📊 Message count: ${messageCount}, Premium: ${isPremiumUser}, Full response: ${shouldGiveFullResponse}`
      );

      const contextPrompt = this.createLoveCalculatorContext(
        req.body.conversationHistory,
        shouldGiveFullResponse
      );

      const responseInstructions = shouldGiveFullResponse
        ? "Gera uma resposta COMPLETA e detalhada de 400-700 palavras com análise numerológica completa, percentagem de compatibilidade exata e conselhos específicos."
        : "Gera uma resposta PARCIAL e INTRIGANTE de 150-250 palavras. INSINUA informação valiosa sem a revelar. Cria CURIOSIDADE. NÃO dês percentagens exatas. NÃO completes a análise.";

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS:
${responseInstructions}

Utilizador: "${userMessage}"

Resposta da especialista em amor (EM PORTUGUÊS DE PORTUGAL):`;

      console.log(
        `A gerar análise de compatibilidade amorosa (${
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
              maxOutputTokens: shouldGiveFullResponse ? 1024 : 512,
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
        finalResponse = this.createPartialResponse(text);
      }

      const chatResponse: LoveCalculatorResponse = {
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
          "Usaste as tuas 3 mensagens gratuitas. Desbloqueia acesso ilimitado para descobrires todos os segredos da tua compatibilidade!";
      }

      console.log(
        `✅ Análise gerada (${
          shouldGiveFullResponse ? "COMPLETA" : "PARCIAL"
        }) com ${usedModel} (${finalResponse.length} caracteres)`
      );
      res.json(chatResponse);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: any, res: Response): void {
    console.error("Erro no LoveCalculatorController:", error);

    let statusCode = 500;
    let errorMessage = "Erro interno do servidor";
    let errorCode = "INTERNAL_ERROR";

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.message;
      errorCode = error.code || "VALIDATION_ERROR";
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

    const errorResponse: ChatResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }

  public getLoveCalculatorInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        loveExpert: {
          name: "Mestra Valentina",
          title: "Guardiã do Amor Eterno",
          specialty: "Compatibilidade numerológica e análise de relações",
          description:
            "Especialista em numerologia do amor especializada em analisar a compatibilidade entre casais",
          services: [
            "Análise de Compatibilidade Numerológica",
            "Cálculo de Números do Amor",
            "Avaliação de Química de Casal",
            "Conselhos para Fortalecer Relações",
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
