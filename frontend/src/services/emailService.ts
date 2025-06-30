export  const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  // Email service temporarily disabled - requires SendGrid API key
  console.log(`Welcome email would be sent to ${email} for ${name}`);
}; 
 