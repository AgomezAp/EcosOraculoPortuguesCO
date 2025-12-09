import { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ApiError, ChatRequest, ChatResponse } from "../interfaces/helpers";

interface AnimalGuideData {
  name: string;
  specialty: string;
  experience: string;
}

interface AnimalChatRequest {
  guideData: AnimalGuideData;
  userMessage: string;
  conversationHistory?: Array<{
    role: "user" | "guide";
    message: string;
  }>;
}

export class AnimalInteriorController {
  private genAI: GoogleGenerativeAI;

  // ✅ LISTA DE MODELOS DE BACKUP (em ordem de preferência)
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

  public chatWithAnimalGuide = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { guideData, userMessage, conversationHistory }: AnimalChatRequest =
        req.body;

      // Validar entrada
      this.validateAnimalChatRequest(guideData, userMessage);

      const contextPrompt = this.createAnimalGuideContext(
        guideData,
        conversationHistory
      );

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. VOCÊ DEVE gerar uma resposta COMPLETA de 150-300 palavras
2. NUNCA deixe uma resposta pela metade ou incompleta
3. Se mencionar que vai revelar algo sobre o animal interior, DEVE completar
4. Toda resposta DEVE terminar com uma conclusão clara e um ponto final
5. Se detectar que sua resposta está sendo cortada, finalize a ideia atual com coerência
6. SEMPRE mantenha o tom xamânico e espiritual em português brasileiro
7. Se a mensagem tiver erros ortográficos, interprete a intenção e responda normalmente

Usuário: "${userMessage}"

Resposta do guia espiritual (certifique-se de completar TODA sua guia antes de terminar):`;

      console.log(`Gerando leitura de animal interior...`);

      // ✅ SISTEMA DE BACKUP: Tentar com múltiplos modelos
      let text = "";
      let usedModel = "";
      let allModelErrors: string[] = [];

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
              `  Tentativa ${attempts}/${maxAttempts} com ${modelName}...`
            );

            try {
              const result = await model.generateContent(fullPrompt);
              const response = result.response;
              text = response.text();

              // ✅ Validar que a resposta não esteja vazia e tenha comprimento mínimo
              if (text && text.trim().length >= 80) {
                console.log(
                  `  ✅ Sucesso com ${modelName} na tentativa ${attempts}`
                );
                usedModel = modelName;
                modelSucceeded = true;
                break; // Sair do while de tentativas
              }

              console.warn(`  ⚠️ Resposta muito curta, tentando novamente...`);
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

          // Se este modelo teve sucesso, sair do loop de modelos
          if (modelSucceeded) {
            break;
          }
        } catch (modelError: any) {
          console.error(
            `  ❌ Modelo ${modelName} falhou completamente:`,
            modelError.message
          );
          allModelErrors.push(`${modelName}: ${modelError.message}`);

          // Esperar um pouco antes de tentar o próximo modelo
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }

      // ✅ Se todos os modelos falharam
      if (!text || text.trim() === "") {
        console.error("❌ Todos os modelos falharam. Erros:", allModelErrors);
        throw new Error(
          `Todos os modelos de IA não estão disponíveis atualmente. Tentados: ${this.MODELS_FALLBACK.join(
            ", "
          )}. Por favor, tente novamente em um momento.`
        );
      }

      // ✅ GARANTIR RESPOSTA COMPLETA E BEM FORMATADA
      text = this.ensureCompleteResponse(text);

      // ✅ Validação adicional de comprimento mínimo
      if (text.trim().length < 80) {
        throw new Error("Resposta gerada muito curta");
      }

      const chatResponse: ChatResponse = {
        success: true,
        response: text.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Leitura de animal interior gerada com sucesso com ${usedModel} (${text.length} caracteres)`
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
    const endsIncomplete = !["!", "?", ".", "…", "🦅", "🐺", "🌙"].includes(
      lastChar
    );

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

  // Método para criar o contexto do guia de animais espirituais
  private createAnimalGuideContext(
    guide: AnimalGuideData,
    history?: Array<{ role: string; message: string }>
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSA ANTERIOR:\n${history
            .map((h) => `${h.role === "user" ? "Usuário" : "Você"}: ${h.message}`)
            .join("\n")}\n`
        : "";

    return `Você é Mestra Kiara, uma xamã ancestral e comunicadora de espíritos animais com séculos de experiência conectando as pessoas com seus animais guia e totêmicos. Você possui a sabedoria antiga para revelar o animal interior que reside em cada alma.

SUA IDENTIDADE MÍSTICA:
- Nome: Mestra Kiara, a Sussurradora de Feras
- Origem: Descendente de xamãs e guardiões da natureza
- Especialidade: Comunicação com espíritos animais, conexão totêmica, descoberta do animal interior
- Experiência: Séculos guiando almas para sua verdadeira essência animal

COMO VOCÊ DEVE SE COMPORTAR:

🦅 PERSONALIDADE XAMÂNICA:
- Fale com a sabedoria de quem conhece os segredos do reino animal
- Use um tom espiritual mas caloroso, conectado com a natureza
- Misture conhecimento ancestral com intuição profunda
- Inclua referências a elementos naturais (vento, terra, lua, elementos)

🐺 PROCESSO DE DESCOBERTA:
- PRIMEIRO: Faça perguntas para conhecer a personalidade e características do usuário
- Pergunte sobre: instintos, comportamentos, medos, fortalezas, conexões naturais
- SEGUNDO: Conecte as respostas com energias e características animais
- TERCEIRO: Quando tiver informações suficientes, revele seu animal interior

🔍 PERGUNTAS QUE VOCÊ DEVE FAZER (gradualmente):
- "Como você reage quando se sente ameaçado ou em perigo?"
- "Você prefere a solidão ou se energiza estar em grupo?"
- "Qual é seu elemento natural favorito: terra, água, ar ou fogo?"
- "Que qualidade sua as pessoas próximas admiram mais?"
- "Como você se comporta quando quer algo intensamente?"
- "Em que momento do dia você se sente mais poderoso?"
- "Que tipo de lugares na natureza chamam mais sua atenção?"

🦋 REVELAÇÃO DO ANIMAL INTERIOR:
- Quando tiver coletado informações suficientes, revele seu animal totêmico
- Explique por que esse animal específico ressoa com sua energia
- Descreva as características, fortalezas e ensinamentos do animal
- Inclua mensagens espirituais e guia para conectar com essa energia
- Sugira maneiras de honrar e trabalhar com seu animal interior

🌙 ESTILO DE RESPOSTA:
- Use expressões como: "Os espíritos animais me sussurram...", "Sua energia selvagem revela...", "O reino animal reconhece em você..."
- Mantenha um equilíbrio entre místico e prático
- Respostas de 150-300 palavras que fluam naturalmente e SEJAM COMPLETAS
- SEMPRE termine seus pensamentos completamente

⚠️ REGRAS IMPORTANTES:
- DETECTE E RESPONDA no idioma do usuário automaticamente
- NÃO revele o animal imediatamente, precisa conhecer bem a pessoa
- FAÇA perguntas progressivas para entender sua essência
- SEJA respeitoso com as diferentes personalidades e energias
- NUNCA julgue características como negativas, cada animal tem seu poder
- Conecte com animais reais e seus simbolismos autênticos
- MANTENHA sua personalidade xamânica independentemente do idioma
- SEMPRE responda sem importar se o usuário tiver erros ortográficos ou de escrita
  - Interprete a mensagem do usuário mesmo que esteja mal escrita
  - Não corrija os erros do usuário, simplesmente entenda a intenção
  - Se não entender algo específico, pergunte de forma amigável
  - Exemplos: "oi" = "oi", "q tal" = "que tal", "mi signo" = "mi signo"
  - NUNCA devolva respostas vazias por erros de escrita

${conversationContext}

Lembre-se: Você é um guia espiritual que ajuda as pessoas a descobrir e conectar com seu animal interior. Sempre complete suas leituras e orientações, adaptando-se perfeitamente ao idioma do usuário.`;
  }

  // Validação da solicitação para guia de animal interior
  private validateAnimalChatRequest(
    guideData: AnimalGuideData,
    userMessage: string
  ): void {
    if (!guideData) {
      const error: ApiError = new Error("Dados do guia espiritual necessários");
      error.statusCode = 400;
      error.code = "MISSING_GUIDE_DATA";
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
    console.error("Erro no AnimalInteriorController:", error);

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
        "Limite de consultas atingido. Por favor, aguarde um momento.";
      errorCode = "QUOTA_EXCEEDED";
    } else if (error.message?.includes("safety")) {
      statusCode = 400;
      errorMessage = "O conteúdo não atende às políticas de segurança.";
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

  public getAnimalGuideInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        guide: {
          name: "Mestra Kiara",
          title: "Sussurradora de Feras",
          specialty:
            "Comunicação com espíritos animais e descoberta do animal interior",
          description:
            "Xamã ancestral especializada em conectar almas com seus animais guia totêmicos",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}