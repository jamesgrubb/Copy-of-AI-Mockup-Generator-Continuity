import { GoogleGenAI, Modality } from "@google/genai";
import { ImageType, MockupStyle, DesignType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateMockup = async (
  base64ImageData: string,
  mimeType: string,
  imageType: ImageType,
  designType: DesignType | null, // Can be null for mobile
  style: MockupStyle,
  continuityImageBase64?: string
): Promise<string> => {
  try {
    let prompt = '';
    const instructions: string[] = [];
    
    if (imageType === ImageType.MOBILE_SCREEN) {
      // --- MOBILE PROMPT LOGIC ---
      prompt = `Task: Create a photorealistic mockup by placing the user's provided mobile screenshot onto a smartphone screen within a styled environment.

User's Design: An image of a mobile phone screenshot.
Environment Style: Create a background scene that is ${style}. The phone should be resting naturally within this scene (e.g., on a table, held by a hand if appropriate for the style).

**CORE CONCEPT**: You are placing a digital screen onto a physical phone. The phone exists in a real, photorealistic scene. The screenshot must look like it's being displayed on an illuminated screen.`;

      instructions.push(
        `**PERFECT SCREEN FIT**: The user's screenshot MUST be displayed on the phone screen without any cropping, distortion, or letterboxing. It must perfectly fit the screen area, maintaining its original aspect ratio.`,
        `**ILLUMINATED SCREEN**: The screen should look like it is turned on and glowing, casting a subtle light on its immediate surroundings.`,
        `**REALISTIC PHONE**: The smartphone model should be modern and generic. Do not add any prominent logos. The phone itself should be integrated realistically into the scene with proper lighting and shadows.`,
        `**OPTIMAL CAMERA ANGLE**: The camera angle is critical. It MUST be a slightly elevated, natural view that clearly shows the entire phone screen. The entire screenshot must be visible and legible. Extreme low or high angles that distort the view or hide the screen are forbidden. The final image must look like a professional product photo focused on the device.`,
        `**BACKGROUND COMPOSITION**: The background should be clean, uncluttered, and perfectly match the requested '${style}' theme.`
      );

      if (continuityImageBase64) {
        prompt = `Task: Create a photorealistic mobile mockup that matches a previous scene.

User's Design: The FIRST image provided is a mobile screenshot.
Reference Scene: The SECOND image provided is the scene you MUST replicate (a phone in an environment).

**CORE CONCEPT**: You are placing a new screenshot onto the screen of the exact same phone in the exact same scene as the Reference Scene. The lighting, phone model, and environment are defined by the Reference Scene.`;

        instructions.unshift(
          `**SCENE REPLICATION**: You MUST use the second image (Reference Scene) as a strict guide. Match the phone model, its position, the background, surface, props, lighting, shadows, and camera angle of the Reference Scene perfectly. The new mockup should look like the screen content has just changed.`
        );
      }
    } else {
      // --- EXISTING PRINT PROMPT LOGIC ---
      if (!designType) {
        throw new Error("Design type (Book or Brochure) is required for print mockups.");
      }
      const fullDesignType = `${designType} ${imageType}`;
      
      prompt = `Task: Create a photorealistic mockup by placing the user's provided design into a styled environment.

User's Design: ${continuityImageBase64 ? "The FIRST image provided is" : "An image of"} a ${fullDesignType}.
Environment Style: Create a background scene that is ${style}.

**CORE CONCEPT**: You are placing a real, physical object (the user's design) into a photorealistic scene. The scene has lighting and a style, but the physical object itself does NOT change color. It should look like a brand new, freshly printed item.`;

      instructions.push(
        `**ABSOLUTE COLOR FIDELITY**: The user's design (the ${fullDesignType}) MUST retain its original colors perfectly. Do NOT, under any circumstances, apply color filters, tints, or color grading from the environment's style (e.g., no sepia/yellow tint for a vintage style) to the user's design. The design's colors are non-negotiable and must be an exact match to the input image.`,
        `**PERFECT CONTENT REPRODUCTION**: All text, logos, and graphics from the user's design must be rendered with perfect clarity and accuracy. No distortion, no changes.`,
        `**REALISTIC INTEGRATION**: The user's design should be realistically integrated into the scene. This means accurate perspective, lighting, and shadows *on* the object. For example, if there's a light source from the left, the left side of the book might be brighter and it might cast a shadow to the right. This is acceptable, but the *base colors* of the book itself must not change.`,
        `**OPTIMAL CAMERA ANGLE**: The camera angle is critical. It MUST be a slightly elevated, professional three-quarters view. This angle ensures the entire design is clearly visible and legible. Low angles that hide content are forbidden. A flat, top-down "scanner" view is also forbidden. The final image must look like a professional product photo where the design is the hero.`,
        `**BACKGROUND COMPOSITION**: The background should be clean, uncluttered, and perfectly match the requested '${style}' theme.`
      );

      if (continuityImageBase64) {
        prompt = `Task: Create a photorealistic mockup that matches a previous scene.

User's Design: The FIRST image provided is a ${fullDesignType}.
Reference Scene: The SECOND image provided is the scene you MUST replicate.

**CORE CONCEPT**: You are placing a real, physical object (the user's design) into the exact same scene as the Reference Scene. The lighting and style are defined by the Reference Scene, but the physical object itself does NOT change color. It should look like a brand new, freshly printed item that has replaced the item in the original photo.`;
        
        instructions.unshift(
          `**SCENE REPLICATION**: You MUST use the second image (Reference Scene) as a strict guide for the new mockup's environment. Match the background, surface, props, lighting, shadows, and camera angle of the Reference Scene perfectly. The new mockup should look like it was photographed in the exact same location.`
        );
      }
    }
    
    prompt += `\n\n**CRITICAL RULES**:\n1. ${instructions.join('\n2. ')}`;

    // Build the parts for the API call
    const parts: any[] = [
      { inlineData: { data: base64ImageData, mimeType: mimeType } },
    ];

    if (continuityImageBase64) {
      parts.push({
        inlineData: {
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

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }

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