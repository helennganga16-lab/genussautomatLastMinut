<?php
// Kopiere diese Datei zu config.php und trage deine Werte ein.
// config.php ist gitignored und darf NICHT committed werden.
//
// Alternative: Werte als Server-Env-Vars setzen (Vercel, Hosting-Panel)
// oder lokal eine .env-Datei anlegen (siehe .env.example).
// Priorität: config.php define > Env-Var > Fallback in contact.php.

define('MAIL_TO',        'office@genussautomaten.at');       // Empfänger
define('MAIL_FROM',      'noreply@genussautomaten.at');      // Absenderadresse
define('MAIL_FROM_NAME', 'Genussautomaten Kontaktformular'); // Absendername

// SMTP (optional) — erst aktiv, wenn sendContactMail() auf SMTP umgestellt wird.
// Bis dahin können diese Konstanten definiert bleiben, ohne Wirkung zu haben.
// define('SMTP_HOST', 'smtp.example.com');
// define('SMTP_PORT', 587);
// define('SMTP_USER', 'user@example.com');
// define('SMTP_PASS', 'dein-passwort');
