require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { createMollieClient } = require('@mollie/api-client'); // ← AJOUT

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Mollie
const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY }); // ← AJOUT

// Configurer le transporteur pour les e-mails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Route formulaire de contact
app.post("/send-email", async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await transporter.sendMail({
            from: `"${name}" <${email}>`,
            to: "admin@alkyai.fr",
            subject: "Nouveau message via le formulaire de contact",
            text: message
        });
        res.status(200).json({ success: true, message: "Votre Email a été envoyé !" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route PayPal (conservée)
app.post("/payment-success", async (req, res) => {
  const { name, email, academy, subject, orderId } = req.body;
  try {
    await transporter.sendMail({
      from: `"AlkyAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Confirmation de votre demande AlkyAI",
      text: `Bonjour ${name},\n\nVotre paiement a bien été reçu ✅\n\nAcadémie : ${academy}\nDiplôme : ${subject}\n\nVotre demande est en cours de traitement.\nVous recevrez vos résultats par email.\n\nRéférence : ${orderId}\n\n— AlkyAI`
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur envoi email" });
  }
});

// ← AJOUT : Route Mollie - Créer un paiement
app.post("/create-payment", async (req, res) => {
  const { name, email, academy, subject } = req.body;
  try {
    const payment = await mollie.payments.create({
      amount:      { currency: 'EUR', value: '3.50' },
      description: `Résultats BAC/Brevet – ${name} – ${academy}`,
      redirectUrl: 'https://alkyai.fr/cancel-formation.html',
      webhookUrl: 'https://alkyai-u7df.onrender.com/mollie-webhook',
   
      metadata:    { name, email, academy, subject }
    });
    res.json({ checkoutUrl: payment.getCheckoutUrl() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur création paiement' });
  }
});

// ← AJOUT : Webhook Mollie - Envoyer l'email après paiement confirmé
app.post("/mollie-webhook", async (req, res) => {
  const { id } = req.body;
  try {
    const payment = await mollie.payments.get(id);
    if (payment.status === 'paid') {
      const { name, email, academy, subject } = payment.metadata;
      await transporter.sendMail({
        from: `"AlkyAI" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Confirmation de votre demande AlkyAI",
        text: `Bonjour ${name},\n\nVotre paiement a bien été reçu ✅\n\nAcadémie : ${academy}\nDiplôme : ${subject}\n\nVotre demande est en cours de traitement.\nVous recevrez vos résultats par email.\n\nRéférence : ${id}\n\n— AlkyAI`
      });
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur webhook');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));