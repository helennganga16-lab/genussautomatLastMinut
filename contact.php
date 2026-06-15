<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(['success' => false, 'message' => 'Ungültige Anfrage.']);
  exit;
}

// Config laden
if (file_exists(__DIR__ . '/config.php')) {
  require __DIR__ . '/config.php';
} else {
  define('MAIL_TO', 'office@genussautomaten.at');
  define('MAIL_FROM', 'noreply@genussautomaten.at');
  define('MAIL_FROM_NAME', 'Genussautomaten Kontaktformular');
}

// Honeypot
if (!empty($_POST['website'])) {
  echo json_encode(['success' => true, 'message' => 'Danke für Ihre Anfrage!']);
  exit;
}

// Validierung
$errors = [];
$unternehmensname = trim($_POST['unternehmensname'] ?? '');
$email = trim($_POST['email'] ?? '');
$telefon = trim($_POST['telefon'] ?? '');
$adresse = trim($_POST['adresse'] ?? '');
$ansprechpartner = trim($_POST['ansprechpartner'] ?? '');
$mitarbeiter = trim($_POST['mitarbeiter'] ?? '');
$nachricht = trim($_POST['nachricht'] ?? '');

if (empty($unternehmensname)) $errors[] = 'Bitte geben Sie Ihren Unternehmensnamen an.';
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';

if (!empty($errors)) {
  echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
  exit;
}

// E-Mail zusammenstellen
$subject = 'Neue Anfrage von ' . $unternehmensname;
$body = "Neue Kontaktanfrage über die Website:\n\n";
$body .= "Unternehmensname: $unternehmensname\n";
$body .= "Adresse: $adresse\n";
$body .= "Telefon: $telefon\n";
$body .= "E-Mail: $email\n";
$body .= "Ansprechpartner: $ansprechpartner\n";
$body .= "Mitarbeiteranzahl: $mitarbeiter\n\n";
$body .= "Nachricht:\n$nachricht\n";

$headers = "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM . ">\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = mail(MAIL_TO, $subject, $body, $headers);

if ($sent) {
  echo json_encode(['success' => true, 'message' => 'Vielen Dank! Wir melden uns in Kürze bei Ihnen.']);
} else {
  echo json_encode(['success' => false, 'message' => 'Die E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie uns direkt unter office@genussautomaten.at']);
}
