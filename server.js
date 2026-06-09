require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Active CORS pour accepter les requêtes depuis n'importe où

// Configurer le transporteur pour les e-mails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true pour le port 465, false pour les autres
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Route pour envoyer un email via le formulaire de contact
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

// ✅ Route PayPal OK (on garde)
app.post("/payment-success", async (req, res) => {
  const { name, email, academy, subject, orderId } = req.body;

  try {
    await transporter.sendMail({
      from: `"AlkyAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Confirmation de votre demande AlkyAI",
      text: `
Bonjour ${name},

Votre paiement PayPal a bien été reçu ✅

Académie : ${academy}
Établissement : ${subject}

Votre demande est en cours de traitement.
Vous recevrez vos résultats par email.

Référence paiement : ${orderId}

— AlkyAI
`
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur envoi email" });
  }
});

// ❌ SUPPRIMÉ : toute la route Stripe create-checkout-session-formation
// (Elle faisait planter car Stripe est bloqué chez toi)

// Démarre le serveur
const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));
