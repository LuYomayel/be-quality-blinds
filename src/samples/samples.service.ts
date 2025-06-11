import { Injectable } from '@nestjs/common';

interface SampleRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  productTypes: string[];
  message?: string;
  chatSummary?: string;
}

@Injectable()
export class SamplesService {
  processSampleRequest(data: SampleRequest): {
    success: boolean;
    message: string;
  } {
    // Procesamos la solicitud de muestras
    console.log('Samples request received:', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      postcode: data.postcode,
      productTypes: data.productTypes,
      message: data.message,
      chatSummary: data.chatSummary,
    });

    // Simular contenido del email
    const emailContent = `
New Sample Request from ${data.name}

Contact Information:
- Name: ${data.name}
- Email: ${data.email}
- Phone: ${data.phone}
- Address: ${data.address}, ${data.postcode}

Products Requested:
${data.productTypes.map((product: string) => `- ${product}`).join('\n')}

Additional Message:
${data.message || 'No additional message'}

${data.chatSummary ? `\n--- CHATBOT CONVERSATION SUMMARY ---\n${data.chatSummary}` : ''}
    `;

    console.log('Sample request email content:', emailContent);

    return {
      success: true,
      message: 'Sample request submitted successfully',
    };
  }
}
