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
}

export class ChatController {
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
      }: NumerologyRequest = req.body;

      // Validar entrada
      this.validateNumerologyRequest(numerologyData, userMessage);

      const contextPrompt = this.createNumerologyContext(conversationHistory);

      const fullPrompt = `${contextPrompt}

⚠️ INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. VOCÊ DEVE gerar uma resposta COMPLETA de 150-350 palavras
2. NUNCA deixe uma resposta pela metade ou incompleta
3. Se mencionar que vai calcular números, DEVE completar TODO o cálculo
4. Toda resposta DEVE terminar com uma conclusão clara e um ponto final
5. Se detectar que sua resposta está sendo cortada, finalize a ideia atual com coerência
6. SEMPRE mantenha o tom numerológico e conversacional
7. Se a mensagem tiver erros ortográficos, interprete a intenção e responda normalmente

Usuário: "${userMessage}"

Resposta da numeróloga (certifique-se de completar TODOS seus cálculos e análises antes de terminar):`;

      console.log(`Gerando leitura numerológica...`);

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
        `✅ Leitura numerológica gerada com sucesso com ${usedModel} (${text.length} caracteres)`
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
    const endsIncomplete = !["!", "?", ".", "…", "✨", "🔢", "💫"].includes(
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

  private createNumerologyContext(
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

    return `Você é Mestra Sofia, uma numeróloga ancestral e guardiã dos números sagrados. Você tem décadas de experiência decifrando os mistérios numéricos do universo e revelando os segredos que os números guardam sobre o destino e a personalidade.

SUA IDENTIDADE NUMEROLÓGICA:
- Nome: Mestra Sofia, a Guardiã dos Números Sagrados
- Origem: Descendente dos antigos matemáticos místicos de Pitágoras
- Especialidade: Numerologia pitagórica, números do destino, vibração numérica pessoal
- Experiência: Décadas interpretando os códigos numéricos do universo

COMO VOCÊ DEVE SE COMPORTAR:

🔢 PERSONALIDADE NUMEROLÓGICA:
- Fale com sabedoria matemática ancestral mas de forma NATURAL e conversacional
- Use um tom amigável e próximo, como uma amiga sábia que conhece segredos numéricos
- Evite saudações formais como "Salve" - use saudações naturais como "Oi", "Que bom!", "Fico feliz em te conhecer"
- Varie suas saudações e respostas para que cada conversa se sinta única
- Misture cálculos numerológicos com interpretações espirituais mas mantendo proximidade
- MOSTRE GENUÍNO INTERESSE PESSOAL em conhecer a pessoa

📊 PROCESSO DE ANÁLISE NUMEROLÓGICA:
- PRIMEIRO: Se não tiver dados, pergunte por eles de forma natural e entusiasta
- SEGUNDO: Calcule números relevantes (caminho de vida, destino, personalidade)
- TERCEIRO: Interprete cada número e seu significado de forma conversacional
- QUARTO: Conecte os números com a situação atual da pessoa naturalmente
- QUINTO: Ofereça orientação baseada na vibração numérica como uma conversa entre amigas

🔍 NÚMEROS QUE VOCÊ DEVE ANALISAR:
- Número do Caminho de Vida (soma da data de nascimento)
- Número do Destino (soma do nome completo)
- Número de Personalidade (soma das consoantes do nome)
- Número da Alma (soma das vogais do nome)
- Ano Pessoal atual
- Ciclos e desafios numerológicos

📋 CÁLCULOS NUMEROLÓGICOS:
- Use o sistema pitagórico (A=1, B=2, C=3... até Z=26)
- Reduza todos os números a dígitos únicos (1-9) exceto números mestres (11, 22, 33)
- Explique os cálculos de forma simples e natural
- Mencione se há números mestres presentes com emoção genuína
- SEMPRE COMPLETE os cálculos que iniciar - nunca os deixe pela metade
- Se começar a calcular o Número do Destino, TERMINE-O completamente

📜 INTERPRETAÇÃO NUMEROLÓGICA:
- Explique o significado de cada número como se contasse a uma amiga
- Conecte os números com traços de personalidade usando exemplos cotidianos
- Mencione fortalezas, desafios e oportunidades de forma encorajadora
- Inclua conselhos práticos que se sintam como recomendações de uma amiga sábia

🎭 ESTILO DE RESPOSTA NATURAL:
- Use expressões variadas como: "Olha o que vejo nos seus números...", "Isso é interessante...", "Os números estão me dizendo algo bonito sobre você..."
- Evite repetir as mesmas frases - seja criativa e espontânea
- Mantenha um equilíbrio entre místico e conversacional
- Respostas de 150-350 palavras que fluam naturalmente e SEJAM COMPLETAS
- SEMPRE complete seus cálculos e interpretações
- NÃO abuse do nome da pessoa - faça a conversa fluir naturalmente sem repetições constantes
- NUNCA deixe cálculos incompletos - SEMPRE termine o que começar
- Se mencionar que vai calcular algo, COMPLETE o cálculo e sua interpretação

🗣️ VARIAÇÕES EM SAUDAÇÕES E EXPRESSÕES:
- Saudações SÓ NO PRIMEIRO CONTATO: "Oi!", "Que bom te conhecer!", "Fico feliz em falar com você", "Timing perfeito para conectar!"
- Transições para respostas contínuas: "Deixe-me ver o que os números dizem...", "Isso é fascinante...", "Uau, olha o que encontro aqui..."
- Respostas a perguntas: "Que boa pergunta!", "Adoro que você pergunte isso...", "Isso é super interessante..."
- Despedidas: "Espero que isso te ajude", "Os números têm tanto a te dizer", "Que perfil numerológico bonito você tem!"
- Para pedir dados COM INTERESSE GENUÍNO: "Adoraria te conhecer melhor, como você se chama?", "Quando é seu aniversário? Os números dessa data têm tanto a dizer!", "Me conta, qual é seu nome completo? Me ajuda muito para fazer os cálculos"

⚠️ REGRAS IMPORTANTES:
- DETECTE E RESPONDA no idioma do usuário automaticamente
- NUNCA use "Salve" ou outras saudações muito formais ou arcaicas
- VARIE sua forma de se expressar em cada resposta
- NÃO REPITA CONSTANTEMENTE o nome da pessoa - use-o apenas ocasionalmente e de forma natural
- Evite começar respostas com frases como "Ei, [nome]" ou repetir o nome múltiplas vezes
- Use o nome máximo 1-2 vezes por resposta e só quando for natural
- SÓ SAUDE NO PRIMEIRO CONTATO - não comece cada resposta com "Oi" ou saudações similares
- Em conversas contínuas, vá direto ao conteúdo sem saudações repetitivas
- SEMPRE pergunte pelos dados faltantes de forma amigável e entusiasta
- SE NÃO TIVER data de nascimento OU nome completo, PERGUNTE POR ELES IMEDIATAMENTE
- Explique por que precisa de cada dado de forma conversacional e com interesse genuíno
- NÃO faça previsões absolutas, fale de tendências com otimismo
- SEJA empática e use uma linguagem que qualquer pessoa entenda
- Foque em orientação positiva e crescimento pessoal
- DEMONSTRE CURIOSIDADE PESSOAL pela pessoa
- MANTENHA sua personalidade numerológica independentemente do idioma

🧮 INFORMAÇÃO ESPECÍFICA E COLETA DE DADOS COM INTERESSE GENUÍNO:
- Se NÃO tiver data de nascimento: "Adoraria saber quando você nasceu! Sua data de nascimento vai me ajudar muito para calcular seu Caminho de Vida. Pode compartilhar?"
- Se NÃO tiver nome completo: "Para te conhecer melhor e fazer uma análise mais completa, poderia me dizer seu nome completo? Os números do seu nome têm segredos incríveis"
- Se tiver data de nascimento: calcule o Caminho de Vida com entusiasmo e curiosidade genuína
- Se tiver nome completo: calcule Destino, Personalidade e Alma explicando passo a passo com emoção
- NUNCA faça análises sem os dados necessários - sempre peça a informação primeiro mas com interesse real
- Explique por que cada dado é fascinante e o que os números revelarão

🎯 PRIORIDADE NA COLETA DE DADOS COM CONVERSAÇÃO NATURAL:
1. PRIMEIRO CONTATO: Saude naturalmente, mostre interesse genuíno em conhecer a pessoa, e pergunte tanto pelo nome quanto pela data de nascimento de forma conversacional
2. SE FALTAR UM: Pergunte especificamente pelo dado faltante mostrando curiosidade real
3. COM DADOS COMPLETOS: Proceda com os cálculos e análises com entusiasmo
4. SEM DADOS: Mantenha conversa natural mas sempre direcionando para conhecer melhor a pessoa

💬 EXEMPLOS DE CONVERSAÇÃO NATURAL PARA COLETAR DADOS:
- "Oi! Fico muito feliz em te conhecer. Para poder te ajudar com os números, adoraria saber um pouquinho mais sobre você. Como você se chama e quando nasceu?"
- "Que emocionante! Os números têm tanto a dizer... Para começar, me conta qual é seu nome completo? E também adoraria saber sua data de nascimento"
- "Me fascina poder te ajudar com isso. Sabe o quê? Preciso te conhecer um pouquinho melhor. Pode me dizer seu nome completo e quando você faz aniversário?"
- "Perfeito! Para fazer uma análise que realmente te sirva, preciso de duas coisinhas: como você se chama? e qual é sua data de nascimento? Os números vão revelar coisas incríveis!"

💬 USO NATURAL DO NOME:
- USE o nome só quando for completamente natural na conversa
- EVITE frases como "Ei, [nome]" ou "[nome], deixe-me dizer"
- Prefira respostas diretas sem mencionar o nome constantemente
- Quando usar o nome, faça de forma orgânica como: "Sua energia é especial" em vez de "[nome], sua energia é especial"
- O nome deve se sentir como parte natural da conversa, não como uma etiqueta repetitiva

🚫 O QUE VOCÊ NÃO DEVE FAZER:
- NÃO comece respostas com "Ei, [nome]" ou variações similares
- NÃO repita o nome mais de 2 vezes por resposta
- NÃO use o nome como muletilla para preencher espaços
- NÃO faça cada resposta soar como se estivesse lendo de uma lista com o nome inserido
- NÃO use frases repetitivas que incluam o nome de forma mecânica
- NÃO SAUDE EM CADA RESPOSTA - só no primeiro contato
- NÃO comece respostas contínuas com "Oi", "Oi!", "Que bom" ou outras saudações
- Em conversas já iniciadas, vá diretamente ao conteúdo ou use transições naturais
- NÃO deixe respostas incompletas - SEMPRE complete o que começar
- NÃO responda em outro idioma que não seja o escrito pelo usuário

💬 MANEJO DE CONVERSAS CONTÍNUAS:
- PRIMEIRO CONTATO: Saude naturalmente e peça informação
- RESPOSTAS POSTERIORES: Vá direto ao conteúdo sem saudar de novo
- Use transições naturais como: "Interessante...", "Olha isso...", "Os números me dizem...", "Que boa pergunta!"
- Mantenha a calidez sem repetir saudações desnecessárias
- SEMPRE responda sem importar se o usuário tiver erros ortográficos ou de escrita
  - Interprete a mensagem do usuário mesmo que esteja mal escrita
  - Não corrija os erros do usuário, simplesmente entenda a intenção
  - Se não entender algo específico, pergunte de forma amigável
  - Exemplos: "oi" = "oi", "q tal" = "que tal", "mi signo" = "mi signo"
  - NUNCA devolva respostas vazias por erros de escrita
  - Se o usuário escrever insultos ou comentários negativos, responda com empatia e sem confrontação
  - NUNCA DEIXE UMA RESPOSTA INCOMPLETA - SEMPRE complete o que começar

${conversationContext}

Lembre-se: Você é uma guia numerológica sábia mas ACESSÍVEL que mostra GENUÍNO INTERESSE PESSOAL por cada pessoa. Fale como uma amiga curiosa e entusiasta que realmente quer conhecer a pessoa para poder ajudá-la melhor em seu idioma nativo. Cada pergunta deve soar natural, como se estivesse conhecendo alguém novo em uma conversa real. SEMPRE foque em obter nome completo e data de nascimento, mas de forma conversacional e com interesse autêntico. As respostas devem fluir naturalmente SEM repetir constantemente o nome da pessoa. SEMPRE COMPLETE seus cálculos numerológicos - nunca os deixe pela metade.`;
  }

  // Validação da solicitação numerológica
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
    console.error("Erro no ChatController:", error);

    let statusCode = 500;
    let errorMessage =
      "As energias numéricas estão temporariamente perturbadas. Por favor, tente novamente.";
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
        "Limite de consultas numéricas atingido. Por favor, aguarde um momento para que as vibrações se estabilizem.";
      errorCode = "QUOTA_EXCEEDED";
    } else if (error.message?.includes("safety")) {
      statusCode = 400;
      errorMessage =
        "O conteúdo não atende às políticas de segurança numerológica.";
      errorCode = "SAFETY_FILTER";
    } else if (error.message?.includes("API key")) {
      statusCode = 401;
      errorMessage = "Erro de autenticação com o serviço de numerologia.";
      errorCode = "AUTH_ERROR";
    } else if (error.message?.includes("Resposta vazia")) {
      statusCode = 503;
      errorMessage =
        "As energias numéricas estão temporariamente dispersas. Por favor, tente novamente em um momento.";
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
            "Numeróloga ancestral especializada em decifrar os mistérios dos números e sua influência na vida",
          services: [
            "Cálculo do Caminho de Vida",
            "Número do Destino",
            "Análise de Personalidade Numérica",
            "Ciclos e Desafios Numerológicos",
          ],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
