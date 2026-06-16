<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Ungültige Anfrage.']);
    exit;
}

// ── MINIMAL .ENV LOADER ──────────────────────────────────────────────────────
// On production (Vercel, shared hosting), set env vars in the server config.
// For local development, a .env file is supported as a convenience.
// .env is gitignored and must never be committed.
$_envFile = __DIR__ . '/.env';
if (file_exists($_envFile)) {
    foreach (file($_envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        $_line = trim($_line);
        if ($_line === '' || $_line[0] === '#' || strpos($_line, '=') === false) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_k = trim($_k);
        $_v = trim($_v, "\"' \t");
        // Only set if the key is not already defined in the server environment
        if ($_k !== '' && getenv($_k) === false) putenv("{$_k}={$_v}");
    }
}
unset($_envFile, $_line, $_k, $_v);

// ── CONFIG ───────────────────────────────────────────────────────────────────
// config.php (gitignored) is loaded last so its constants take highest priority.
// Resolution order: config.php define → env var → hardcoded default.
if (file_exists(__DIR__ . '/config.php')) {
    require __DIR__ . '/config.php';
}

/**
 * Resolve a config value: PHP constant > env var > hardcoded default.
 */
function cfg(string $const, string $envKey, string $default): string {
    if (defined($const)) return (string) constant($const);
    $v = getenv($envKey);
    return ($v !== false && $v !== '') ? $v : $default;
}

$mailTo       = cfg('MAIL_TO',        'CONTACT_RECEIVER_EMAIL', 'office@genussautomaten.at');
$mailFrom     = cfg('MAIL_FROM',      'MAIL_FROM',              'noreply@genussautomaten.at');
$mailFromName = cfg('MAIL_FROM_NAME', 'MAIL_FROM_NAME',         'Genussautomaten Kontaktformular');

// ── MAIL HELPERS ─────────────────────────────────────────────────────────────
require __DIR__ . '/mail_service.php';

// ── HONEYPOT ─────────────────────────────────────────────────────────────────
if (!empty($_POST['website'])) {
    echo json_encode(['success' => true, 'message' => 'Danke für Ihre Anfrage!']);
    exit;
}

// ── SPAM: MINIMUM SUBMIT TIME ─────────────────────────────────────────────────
// The form sets a hidden `form_ts` field (Unix timestamp in seconds) on load.
// Submissions arriving in under 2 seconds are very likely bots.
$formTs = isset($_POST['form_ts']) ? (int) $_POST['form_ts'] : 0;
if ($formTs > 0 && (time() - $formTs) < 2) {
    echo json_encode(['success' => true, 'message' => 'Danke für Ihre Anfrage!']);
    exit;
}

// ── LENGTH LIMITS & FIELD EXTRACTION ─────────────────────────────────────────
// Only the listed fields are processed; any additional POST keys are ignored.
$maxLengths = [
    'unternehmensname' => 200,
    'email'            => 254,
    'telefon'          => 30,
    'adresse'          => 200,
    'ansprechpartner'  => 200,
    'mitarbeiter'      => 50,
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

// ── VALIDATION ───────────────────────────────────────────────────────────────
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

// ── HEADER INJECTION PREVENTION ───────────────────────────────────────────────
// Strip CR, LF, and null bytes from any value that flows into a mail header
// or subject line. This prevents newline-based header injection attacks.
function sanitize_header_val(string $v): string {
    return str_replace(["\r", "\n", "\0"], '', trim($v));
}

$safeCompany  = sanitize_header_val($fields['unternehmensname']);
$safeEmail    = sanitize_header_val($fields['email']);
$safeFromName = sanitize_header_val($mailFromName);
$safeFrom     = sanitize_header_val($mailFrom);

$subject = 'Neue Anfrage von ' . $safeCompany;

// ── SEND ─────────────────────────────────────────────────────────────────────
$htmlBody = buildContactEmailHtml($fields);
$textBody = buildContactEmailText($fields);

$sent = sendContactMail($mailTo, $subject, $htmlBody, $textBody, $safeFromName, $safeFrom, $safeEmail);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Vielen Dank! Wir melden uns in Kürze bei Ihnen.']);
} else {
    error_log('[Genussautomaten] mail() failed for contact submission from: ' . $fields['email']);
    echo json_encode(['success' => false, 'message' => 'Die E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie uns direkt unter office@genussautomaten.at']);
}
