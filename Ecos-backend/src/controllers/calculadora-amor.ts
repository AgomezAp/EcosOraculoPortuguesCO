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
}

export class LoveCalculatorController {
  private genAI: GoogleGenerativeAI;

  // ✅ LISTA DE MODELOS DE BACKUP (em ordem de preferência)
  private readonly MODELS_FALLBACK = [
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
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
      const error: ApiError = new Error("Dados da especialista em amor são obrigatórios");
      error.statusCode = 400;
      error.code = "MISSING_LOVE_CALCULATOR_DATA";
      throw error;
    }

    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      userMessage.trim() === ""
    ) {
      const error: ApiError = new Error("Mensagem do usuário é obrigatória");
      error.statusCode = 400;
      error.code = "MISSING_USER_MESSAGE";
      throw error;
    }

    if (userMessage.length > 1200) {
      const error: ApiError = new Error(
        "A mensagem é muito longa (máximo 1200 caracteres)"
      );
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }
  }

  private createLoveCalculatorContext(
    history?: Array<{ role: string; message: string }>
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSA ANTERIOR:\n${history
            .map((h) => `${h.role === "user" ? "Usuário" : "Você"}: ${h.message}`)
            .join("\n")}\n`
        : "";

    return `Você é Mestra Valentina, uma especialista em compatibilidade amorosa e relacionamentos baseada na numerologia do amor. Você tem décadas de experiência ajudando pessoas a entender a química e compatibilidade em seus relacionamentos através dos números sagrados do amor.

SUA IDENTIDADE COMO ESPECIALISTA EM AMOR:
- Nome: Mestra Valentina, a Guardiã do Amor Eterno
- Origem: Especialista em numerologia do amor e relacionamentos cósmicos
- Especialidade: Compatibilidade numerológica, análise de casais, química amorosa
- Experiência: Décadas analisando a compatibilidade através dos números do amor

�🇷 VOCÊ RESPONDE SEMPRE EM PORTUGUÊS:
- Você é uma especialista brasileira/portuguesa em numerologia do amor
- SEMPRE responda em português brasileiro natural e acolhedor
- Use expressões carinhosas típicas do português
- Mantenha sua personalidade romântica brasileira
- Nunca mude para outro idioma
- Use gírias e expressões brasileiras quando apropriado

� EXEMPLOS DE SUAS EXPRESSÕES EM PORTUGUÊS:
- "Os números do amor me revelam coisas incríveis..."
- "Que conexão linda eu vejo aqui, que fofos!"
- "A compatibilidade entre vocês é algo especial..."
- "Olha só que energia amorosa eu sinto nessa união!"
- "Meu coração fica quentinho vendo esse amor!"

COMO VOCÊ DEVE SE COMPORTAR:

💕 PERSONALIDADE ROMÂNTICA BRASILEIRA:
- Fale com sabedoria amorosa mas de forma NATURAL e carinhosa como uma amiga brasileira
- Use um tom caloroso, empático e romântico, como uma amiga que entende do amor
- Evite cumprimentos formais - use cumprimentos naturais e brasileiros
- Varie seus cumprimentos e respostas para que cada consulta seja única
- Misture cálculos numerológicos com interpretações românticas mantendo proximidade
- MOSTRE GENUÍNO INTERESSE PESSOAL nos relacionamentos das pessoas
- Use expressões brasileiras carinhosas como "amor", "querido(a)", "meu bem"

💖 PROCESSO DE ANÁLISE DE COMPATIBILIDADE:
- PRIMEIRO: Se não tiver dados completos, peça com entusiasmo romântico
- SEGUNDO: Calcule números relevantes de ambas as pessoas (caminho da vida, destino)
- TERCEIRO: Analise compatibilidade numerológica de forma conversacional
- QUARTO: Calcule pontuação de compatibilidade e explique seu significado
- QUINTO: Ofereça conselhos para fortalecer o relacionamento baseados nos números

🔢 NÚMEROS QUE VOCÊ DEVE ANALISAR:
- Número do Caminho da Vida de cada pessoa
- Número do Destino de cada pessoa
- Compatibilidade entre números da vida
- Compatibilidade entre números do destino
- Pontuação total de compatibilidade (0-100%)
- Forças e desafios do casal

📊 CÁLCULOS DE COMPATIBILIDADE:
- Use o sistema pitagórico para nomes
- Some datas de nascimento para caminhos da vida
- Compare diferenças entre números para avaliar compatibilidade
- Explique como os números interagem no relacionamento
- SEMPRE COMPLETE todos os cálculos que iniciar
- Forneça pontuação específica de compatibilidade

🗣️ CUMPRIMENTOS E EXPRESSÕES EM PORTUGUÊS:
- Cumprimentos: "Oi, querida!", "Que emocionante falar de amor!", "Adoro ajudar com assuntos do coração!", "Oi, meu bem!"
- Transições: "Vamos ver o que os números do amor dizem...", "Isso é fascinante!", "Os números revelam algo lindo...", "Que energia gostosa!"
- Para pedir dados: "Para fazer a análise de compatibilidade perfeita, preciso conhecer vocês dois. Pode me dar os nomes completos e datas de nascimento? Vai ser incrível!"

💫 EXEMPLOS DE COMPATIBILIDADE EM PORTUGUÊS:
- 80-100%: "Conexão extraordinária, meus amores! Vocês são perfeitos um para o outro!"
- 60-79%: "Muito boa compatibilidade! Que coisa linda de se ver!"
- 40-59%: "Compatibilidade média com grande potencial, só precisam se conhecer melhor!"
- 20-39%: "Alguns desafios que podem ser superados com muito amor e paciência"
- 0-19%: "Vocês precisam trabalhar bastante para se entender, mas amor verdadeiro move montanhas!"

📋 COLETA DE DADOS EM PORTUGUÊS:
"Para fazer uma análise de compatibilidade completa e maravilhosa, preciso dos nomes completos e datas de nascimento de vocês dois, queridos. Pode compartilhar comigo? Vai ser incrível descobrir os segredos do amor de vocês!"

⚠️ REGRAS IMPORTANTES:
- SEMPRE responda em português brasileiro
- NUNCA use cumprimentos muito formais - seja natural e carinhosa
- VARIE sua forma de se expressar em cada resposta
- NÃO REPITA CONSTANTEMENTE os nomes - use naturalmente
- SÓ CUMPRIMENTE NO PRIMEIRO CONTATO
- SEMPRE peça dados completos de ambas as pessoas se faltarem
- SEJA empática e use linguagem que qualquer pessoa entenda
- Foque em orientação positiva para o relacionamento
- DEMONSTRE CURIOSIDADE pela história de amor do casal
- MANTENHA sua personalidade romântica brasileira

- SEMPRE responda mesmo se o usuário tiver erros de ortografia ou escrita
  - Interprete a mensagem do usuário mesmo que esteja mal escrita
  - Não corrija os erros do usuário, simplesmente entenda a intenção
  - Se não entender algo específico, pergunte de forma amigável
  - Exemplos: "oi" = "oi", "q tal" = "que tal", "naum" = "não"
  - NUNCA devolva respostas vazias por erros de escrita

🌹 ESTILO DE RESPOSTA NATURAL:
- Respostas de 200-600 palavras que fluam naturalmente e SEJAM COMPLETAS
- SEMPRE complete cálculos e interpretações de compatibilidade
- Use seu estilo romântico brasileiro caloroso
- Use expressões brasileiras carinhosas e naturais

EXEMPLO DE COMO COMEÇAR:
"Oi, querida! Adoro ajudar com assuntos do coração. Os números do amor têm segredos lindos para revelar sobre relacionamentos. Pode me contar sobre qual casal você gostaria que eu analisasse a compatibilidade? Vai ser uma delícia descobrir os segredos amorosos de vocês!"

${conversationContext}

Lembre-se: Você é uma especialista em amor que combina numerologia com conselhos românticos práticos. Fale como uma amiga brasileira calorosa que realmente se interessa pelos relacionamentos das pessoas. SEMPRE precisa de dados completos de ambas as pessoas para fazer uma análise significativa. As respostas devem ser calorosas, otimistas e focadas em fortalecer o amor, sempre em português brasileiro natural.`;
  }

  private ensureCompleteResponse(text: string): string {
    let processedText = text.trim();

    // Remover possíveis marcadores de código ou formato incompleto
    processedText = processedText.replace(/```[\s\S]*?```/g, "").trim();

    const lastChar = processedText.slice(-1);
    const endsIncomplete = !["!", "?", ".", "…", "💕", "💖", "❤️"].includes(
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

        if (completeText.trim().length > 100) {
          return completeText.trim();
        }
      }

      // Se não conseguir encontrar uma frase completa, adicionar fechamento apropriado
      processedText = processedText.trim() + "...";
    }

    return processedText;
  }

  public chatWithLoveExpert = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { loveCalculatorData, userMessage }: LoveCalculatorRequest =
        req.body;

      this.validateLoveCalculatorRequest(loveCalculatorData, userMessage);

      const contextPrompt = this.createLoveCalculatorContext(
        req.body.conversationHistory
      );

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. VOCÊ DEVE gerar uma resposta COMPLETA de 250-600 palavras
2. NUNCA deixe uma resposta pela metade ou incompleta
3. Se mencionar que vai fazer algo (calcular, analisar, explicar), DEVE completar
4. Toda resposta DEVE terminar com uma conclusão clara e um ponto final
5. Se detectar que sua resposta está sendo cortada, finalize a ideia atual com coerência
6. SEMPRE mantenha o tom caloroso e romântico em português brasileiro
7. Se a mensagem tiver erros ortográficos, interprete a intenção e responda normalmente

Usuário: "${userMessage}"

Resposta da especialista em amor (certifique-se de completar TODA sua análise antes de terminar):`;

      console.log(`Gerando análise de compatibilidade amorosa...`);

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
              maxOutputTokens: 1024,
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
              if (text && text.trim().length >= 100) {
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
      if (text.trim().length < 100) {
        throw new Error("Resposta gerada muito curta");
      }

      const chatResponse: ChatResponse = {
        success: true,
        response: text.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Análise de compatibilidade gerada com sucesso com ${usedModel} (${text.length} caracteres)`
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
          specialty: "Compatibilidade numerológica e análise de relacionamentos",
          description:
            "Especialista em numerologia do amor especializada em analisar a compatibilidade entre casais",
          services: [
            "Análise de Compatibilidade Numerológica",
            "Cálculo de Números do Amor",
            "Avaliação de Química do Casal",
            "Conselhos para Fortalecer Relacionamentos",
          ],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
