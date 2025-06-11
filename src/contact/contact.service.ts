import { Injectable } from '@nestjs/common';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  postcode?: string;
  address?: string;
  service?: string;
  product?: string;
  chatSummary?: string;
  images?: Express.Multer.File[];
}

@Injectable()
export class ContactService {
  processContactForm(
    data: ContactFormData,
  ): Promise<{ success: boolean; message: string }> {
    // Aquí procesaríamos el formulario de contacto
    // Por ahora solo lo logeamos
    console.log('Contact form submission received:', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      postcode: data.postcode,
      address: data.address,
      service: data.service,
      product: data.product,
      chatSummary: data.chatSummary,
      imageCount: data.images?.length || 0,
    });

    // Simular el contenido del email
    const emailContent = `
New Contact Form Submission from ${data.name}

Contact Information:
- Name: ${data.name}
- Email: ${data.email}
- Phone: ${data.phone}
- Address: ${data.address || 'Not provided'}
- Postcode: ${data.postcode || 'Not provided'}

Service Request:
- Service: ${data.service}
- Product: ${data.product}

Message:
${data.message}

${data.images && data.images.length > 0 ? `\nAttachments: ${data.images.length} image(s) uploaded` : ''}

${data.chatSummary ? `\n--- CHATBOT CONVERSATION SUMMARY ---\n${data.chatSummary}` : ''}
    `;

    console.log('Contact form email content:', emailContent);

    return Promise.resolve({
      success: true,
      message: 'Contact form submitted successfully',
    });
  }
}
