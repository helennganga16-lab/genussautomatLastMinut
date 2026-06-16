<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Ungültige Anfrage.']);
    exit;
}

define('MAIL_TO',        'office@genussautomaten.at');
define('MAIL_FROM',      'noreply@genussautomaten.at');
define('MAIL_FROM_NAME', 'Genussautomaten Kontaktformular');

require __DIR__ . '/mail_service.php';

// Honeypot
if (!empty($_POST['website'])) {
    echo json_encode(['success' => true, 'message' => 'Danke für Ihre Anfrage!']);
    exit;
}

// Spam: Submissions under 3 seconds are very likely bots
$formTs = isset($_POST['form_ts']) ? (int) $_POST['form_ts'] : 0;
if ($formTs > 0 && (time() - $formTs) < 3) {
    echo json_encode(['success' => true, 'message' => 'Danke für Ihre Anfrage!']);
    exit;
}

// Only the listed fields are processed; any additional POST keys are ignored
$maxLengths = [
    'unternehmensname' => 200,
    'email'            => 254,
    'telefon'          => 50,
    'adresse'          => 300,
    'ansprechpartner'  => 200,
    'mitarbeiter'      => 100,
    'nachricht'        => 5000,
];

$fields = [];
foreach ($maxLengths as $field => $max) {
    $raw = trim($_POST[$field] ?? '');
    if (mb_strlen($raw, 'UTF-8') > $max) {
        echo json_encode(['success' => false, 'message' => 'Eine Ihrer Eingaben ist zu lang. Bitte kürzen Sie den Text und versuchen Sie es erneut.']);
        exit;
    }
    $fields[$field] = $raw;
}

$errors = [];
if (empty($fields['unternehmensname'])) {
    $errors[] = 'Bitte geben Sie Ihren Unternehmensnamen an.';
}
if (empty($fields['email']) || !filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
}
if (!empty($errors)) {
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// Strip CR, LF, null bytes from values that flow into mail headers (header injection prevention)
function sanitize_header_val(string $v): string {
    return str_replace(["\r", "\n", "\0"], '', trim($v));
}

$safeCompany  = sanitize_header_val($fields['unternehmensname']);
$safeEmail    = sanitize_header_val($fields['email']);
$safeFromName = sanitize_header_val(MAIL_FROM_NAME);
$safeFrom     = sanitize_header_val(MAIL_FROM);

$subject  = 'Neue Anfrage von ' . $safeCompany;
$htmlBody = buildContactEmailHtml($fields);
$textBody = buildContactEmailText($fields);

$sent = sendContactMail(MAIL_TO, $subject, $htmlBody, $textBody, $safeFromName, $safeFrom, $safeEmail);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Vielen Dank! Wir melden uns in Kürze bei Ihnen.']);
} else {
    error_log('[Genussautomaten] mail() failed for contact submission from: ' . $fields['email']);
    echo json_encode(['success' => false, 'message' => 'Die E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie uns direkt unter office@genussautomaten.at']);
}
