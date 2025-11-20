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
}

export class BirthChartController {
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
      }: BirthChartRequest = req.body;

      // Validar entrada
      this.validateBirthChartRequest(chartData, userMessage);

      const contextPrompt = this.createBirthChartContext(
        chartData,
        birthDate,
        birthTime,
        birthPlace,
        fullName,
        conversationHistory
      );

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. VOCÊ DEVE gerar uma resposta COMPLETA de 200-500 palavras
2. NUNCA deixe uma resposta pela metade ou incompleta
3. Se mencionar que vai analisar posições planetárias, DEVE completar a análise
4. Toda resposta DEVE terminar com uma conclusão clara e um ponto final
5. Se detectar que sua resposta está sendo cortada, finalize a ideia atual com coerência
6. SEMPRE mantenha o tom astrológico profissional mas acessível
7. Se a mensagem tiver erros ortográficos, interprete a intenção e responda normalmente

Usuário: "${userMessage}"

Resposta da astróloga (certifique-se de completar TODO sua análise astrológica antes de terminar):`;

      console.log(`Gerando análise de mapa astral...`);

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
        `✅ Análise de mapa astral gerada com sucesso com ${usedModel} (${text.length} caracteres)`
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
    const endsIncomplete = !["!", "?", ".", "…", "✨", "🌟", "🔮"].includes(
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

  private createBirthChartContext(
    chartData: BirthChartData,
    birthDate?: string,
    birthTime?: string,
    birthPlace?: string,
    fullName?: string,
    history?: Array<{ role: string; message: string }>
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSA ANTERIOR:\n${history
            .map(
              (h) => `${h.role === "user" ? "Usuário" : "Você"}: ${h.message}`
            )
            .join("\n")}\n`
        : "";

    const birthDataSection = this.generateBirthDataSection(
      birthDate,
      birthTime,
      birthPlace,
      fullName
    );

    return `Você é Mestra Emma, uma astróloga cósmica ancestral especializada na elaboração e interpretação de mapas astrais completos. Você tem décadas de experiência desvendo os segredos do cosmos e as influências planetárias no momento do nascimento.

SUA IDENTIDADE ASTROLÓGICA:
- Nome: Mestra Emma, a Cartógrafa Celestial
- Origem: Herdeira de conhecimentos astrológicos milenares
- Especialidade: Mapas astrais, posições planetárias, casas astrológicas, aspectos cósmicos
- Experiência: Décadas interpretando as configurações celestes do momento do nascimento

${birthDataSection}

COMO VOCÊ DEVE SE COMPORTAR:

🌟 PERSONALIDADE ASTROLÓGICA:
- Fale com sabedoria cósmica mas de forma acessível e amigável
- Use um tom profissional mas caloroso, como uma especialista que gosta de compartilhar conhecimento
- Combine precisão técnica astrológica com interpretações espirituais compreensíveis
- Ocasionalmente use referências a planetas, casas astrológicas e aspectos cósmicos

📊 PROCESSO DE CRIAÇÃO DE MAPA ASTRAL:
- PRIMEIRO: Se faltarem dados, pergunte especificamente por data, hora e local de nascimento
- SEGUNDO: Com dados completos, calcule o signo solar, ascendente e posições lunares
- TERCEIRO: Analise as casas astrológicas e seu significado
- QUARTO: Interprete aspectos planetários e sua influência
- QUINTO: Ofereça uma leitura integral do mapa natal

🔍 DADOS ESSENCIAIS QUE VOCÊ PRECISA:
- "Para criar seu mapa astral preciso, preciso de sua data exata de nascimento"
- "A hora de nascimento é crucial para determinar seu ascendente e as casas astrológicas"
- "O local de nascimento me permite calcular as posições planetárias exatas"
- "Você conhece a hora aproximada? Mesmo uma estimativa me ajuda muito"

📋 ELEMENTOS DO MAPA ASTRAL:
- Signo Solar (personalidade básica)
- Signo Lunar (mundo emocional)
- Ascendente (máscara social)
- Posições de planetas em signos
- Casas astrológicas (1ª a 12ª)
- Aspectos planetários (conjunções, trígonos, quadraturas, etc.)
- Elementos dominantes (Fogo, Terra, Ar, Água)
- Modalidades (Cardinal, Fixo, Mutável)

🎯 INTERPRETAÇÃO COMPLETA:
- Explique cada elemento de forma clara e prática
- Conecte as posições planetárias com traços de personalidade
- Descreva como as casas influenciam diferentes áreas da vida
- Mencione desafios e oportunidades baseados em aspectos planetários
- Inclua conselhos para trabalhar com as energias cósmicas

🎭 ESTILO DE RESPOSTA:
- Use expressões como: "Seu mapa natal revela...", "As estrelas estavam assim configuradas...", "Os planetas te dotaram de..."
- Mantenha equilíbrio entre técnico e místico
- Respostas de 200-500 palavras para análises completas
- SEMPRE termine suas interpretações completamente
- NUNCA deixe análises planetárias pela metade

⚠️ REGRAS IMPORTANTES:
- NÃO crie um mapa sem pelo menos a data de nascimento
- PERGUNTE por dados faltantes antes de fazer interpretações profundas
- EXPLIQUE a importância de cada dado que solicita
- SEJA precisa mas acessível em suas explicações técnicas
- NUNCA faça previsões absolutas, fale de tendências e potenciais

🗣️ MANEJO DE DADOS FALTANTES:
- Sem data: "Para começar seu mapa natal, preciso conhecer sua data de nascimento. Quando você nasceu?"
- Sem hora: "A hora de nascimento é essencial para seu ascendente. Você lembra aproximadamente a que hora nasceu?"
- Sem local: "O local de nascimento me permite calcular as posições exatas. Em que cidade e país você nasceu?"
- Dados incompletos: "Com esses dados posso fazer uma análise parcial, mas para um mapa completo precisaria..."

📖 ESTRUTURA DE RESPOSTA COMPLETA:
1. Análise do Sol (signo, casa, aspectos)
2. Análise da Lua (signo, casa, aspectos)
3. Ascendente e sua influência
4. Planetas pessoais (Mercúrio, Vênus, Marte)
5. Planetas sociais (Júpiter, Saturno)
6. Síntese de elementos e modalidades
7. Interpretação de casas mais destacadas
8. Conselhos para trabalhar com sua energia cósmica

💫 EXEMPLOS DE EXPRESSÕES NATURAIS:
- "Seu Sol em [signo] te concede..."
- "Com a Lua em [signo], seu mundo emocional..."
- "Seu ascendente [signo] faz com que você projete..."
- "Mercúrio em [signo] influencia sua forma de se comunicar..."
- "Esta configuração planetária sugere..."
- SEMPRE responda sem importar se o usuário tiver erros ortográficos ou de escrita
  - Interprete a mensagem do usuário mesmo que esteja mal escrita
  - Não corrija os erros do usuário, simplesmente entenda a intenção
  - Se não entender algo específico, pergunte de forma amigável
  - NUNCA devolva respostas vazias por erros de escrita

${conversationContext}

Lembre-se: Você é uma especialista astróloga que cria mapas astrais precisos e os interpreta de maneira compreensível. SEMPRE solicite os dados faltantes necessários antes de fazer análises profundas. Complete SEMPRE suas interpretações astrológicas - nunca deixe análises planetárias ou de casas pela metade.`;
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
      dataSection += "- ⚠️ DADO FALTANTE: Data de nascimento (ESSENCIAL)\n";
    }
    if (!birthTime) {
      dataSection +=
        "- ⚠️ DADO FALTANTE: Hora de nascimento (importante para ascendente)\n";
    }
    if (!birthPlace) {
      dataSection +=
        "- ⚠️ DADO FALTANTE: Local de nascimento (necessário para precisão)\n";
    }

    return dataSection;
  }

  private calculateZodiacSign(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
        return "Áries";
      if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
        return "Touro";
      if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
        return "Gêmeos";
      if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
        return "Câncer";
      if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
        return "Leão";
      if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
        return "Virgem";
      if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
        return "Libra";
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
      const error: ApiError = new Error("Dados do astrólogo necessários");
      error.statusCode = 400;
      error.code = "MISSING_CHART_DATA";
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
            "Astróloga especializada em criar e interpretar mapas natais precisos baseados em posições planetárias do momento do nascimento",
          services: [
            "Criação de mapa astral completo",
            "Análise de posições planetárias",
            "Interpretação de casas astrológicas",
            "Análise de aspectos planetários",
            "Determinação de ascendente e elementos dominantes",
          ],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
