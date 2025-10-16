import { GoogleGenAI, Modality } from "@google/genai";
import { ImageType, MockupStyle, DesignType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateMockup = async (
  base64ImageData: string,
  mimeType: string,
  imageType: ImageType,
  designType: DesignType,
  style: MockupStyle,
  continuityImageBase64?: string
): Promise<string> => {
  try {
    const fullDesignType = `${designType} ${imageType}`;
    
    // Base prompt
    let prompt = `Task: Create a photorealistic mockup by placing the user's provided design into a styled environment.

User's Design: ${continuityImageBase64 ? "The FIRST image provided is" : "An image of"} a ${fullDesignType}.
Environment Style: Create a background scene that is ${style}.

**CORE CONCEPT**: You are placing a real, physical object (the user's design) into a photorealistic scene. The scene has lighting and a style, but the physical object itself does NOT change color. It should look like a brand new, freshly printed item.`;

    // Instructions array
    const instructions = [
      `**ABSOLUTE COLOR FIDELITY**: The user's design (the ${fullDesignType}) MUST retain its original colors perfectly. Do NOT, under any circumstances, apply color filters, tints, or color grading from the environment's style (e.g., no sepia/yellow tint for a vintage style) to the user's design. The design's colors are non-negotiable and must be an exact match to the input image.`,
      `**PERFECT CONTENT REPRODUCTION**: All text, logos, and graphics from the user's design must be rendered with perfect clarity and accuracy. No distortion, no changes.`,
      `**REALISTIC INTEGRATION**: The user's design should be realistically integrated into the scene. This means accurate perspective, lighting, and shadows *on* the object. For example, if there's a light source from the left, the left side of the book might be brighter and it might cast a shadow to the right. This is acceptable, but the *base colors* of the book itself must not change.`,
      `**BACKGROUND COMPOSITION**: The background should be clean, uncluttered, and perfectly match the requested '${style}' theme.`
    ];

    if (continuityImageBase64) {
      prompt = `Task: Create a photorealistic mockup that matches a previous scene.

User's Design: The FIRST image provided is a ${fullDesignType}.
Reference Scene: The SECOND image provided is the scene you MUST replicate.

**CORE CONCEPT**: You are placing a real, physical object (the user's design) into the exact same scene as the Reference Scene. The lighting and style are defined by the Reference Scene, but the physical object itself does NOT change color. It should look like a brand new, freshly printed item that has replaced the item in the original photo.`;
      
      // Prepend continuity instruction to make it the top priority
      instructions.unshift(
        `**SCENE REPLICATION**: You MUST use the second image (Reference Scene) as a strict guide for the new mockup's environment. Match the background, surface, props, lighting, shadows, and camera angle of the Reference Scene perfectly. The new mockup should look like it was photographed in the exact same location.`
      );
    }
    
    prompt += `\n\n**CRITICAL RULES**:\n1. ${instructions.join('\n2. ')}`;

    // Build the parts for the API call
    const parts: any[] = [
      { inlineData: { data: base64ImageData, mimeType: mimeType } },
    ];

    if (continuityImageBase64) {
      parts.push({
        inlineData: {
          // Assuming continuity image is also png/jpeg from the app's output
          data: continuityImageBase64,
          mimeType: 'image/png', 
        },
      });
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];

    // Happy path: image is generated and present
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }

    // Unhappy path: something went wrong, let's find out what.
    console.error("Invalid response from Gemini API:", JSON.stringify(response, null, 2));

    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Request blocked by the API's safety filter (Reason: ${blockReason}). This can be triggered by certain content, such as realistic depictions of people. Please try a different image.`);
    }

    const finishReason = candidate?.finishReason;
    if (finishReason) {
        switch (finishReason as string) {
            case 'SAFETY':
                throw new Error("Image generation was blocked for safety reasons. This can be triggered by certain content, such as realistic depictions of people. Please try a different image.");
            case 'IMAGE_OTHER':
            case 'OTHER':
                throw new Error("The AI couldn't create a mockup for this combination. Please try a different style or a different image.");
            default:
                throw new Error(`Image generation failed with an unexpected reason: ${finishReason}.`);
        }
    }

    throw new Error("No image data found in API response. The AI may have failed to generate an image.");

  } catch (error) {
    console.error("Error generating mockup:", error);
    throw error;
  }
};


export const removePersonFromImage = async (
  base64ImageData: string,
  mimeType: string
): Promise<string> => {
  try {
    const prompt = "You are an expert photo editor. Your task is to completely remove any and all people from the user-provided image. Intelligently fill in the background where the people were, ensuring the result looks natural and seamless. Preserve all other elements of the image, such as text, logos, and background graphics, with perfect fidelity. Do not alter the aspect ratio or overall composition.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: { data: base64ImageData, mimeType: mimeType },
          },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }

    console.error("Invalid response from Gemini API during image repair:", JSON.stringify(response, null, 2));
    
    const finishReason = candidate?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error("The AI's safety filter also blocked the attempt to edit the image. Please try a different original image.");
    }

    throw new Error("The AI failed to edit the image. Please try again.");

  } catch (error) {
    console.error("Error removing person from image:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while trying to repair the image.");
  }
};