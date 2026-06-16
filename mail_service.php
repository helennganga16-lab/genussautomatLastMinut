<?php
/**
 * Mail helper functions for Genussautomaten contact forms.
 *
 * Include this file from contact.php — do NOT expose it directly via HTTP.
 * All user-supplied values are escaped with htmlspecialchars before being
 * placed into the HTML body to prevent XSS in email clients.
 */

/**
 * Escape a value for safe insertion into an HTML email body.
 */
function mail_he(string $v): string {
    return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Build a single table row for the HTML email.
 */
function mail_row(string $label, string $escapedValue): string {
    $l = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
    return '<tr>'
        . '<td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:170px;vertical-align:top;">' . $l . '</td>'
        . '<td style="padding:8px 12px;border-bottom:1px solid #eee;">' . $escapedValue . '</td>'
        . '</tr>';
}

/**
 * Build a multipart/alternative HTML email body for a contact form submission.
 * All $fields values must be plain strings (already length-checked server-side).
 *
 * @param array<string,string> $fields  Keys: unternehmensname, adresse, telefon,
 *                                            email, ansprechpartner, mitarbeiter, nachricht
 */
function buildContactEmailHtml(array $fields): string {
    $he = 'mail_he';
    return implode('', [
        '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        '</head><body style="font-family:Arial,sans-serif;color:#222;max-width:620px;margin:0 auto;padding:24px;">',
        '<h2 style="color:#F07D00;margin-top:0;">Neue Kontaktanfrage</h2>',
        '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">',
        mail_row('Unternehmensname', $he($fields['unternehmensname'] ?? '')),
        mail_row('Adresse',          $he($fields['adresse']          ?? '')),
        mail_row('Telefon',          $he($fields['telefon']          ?? '')),
        mail_row('E-Mail',           $he($fields['email']            ?? '')),
        mail_row('Ansprechpartner',  $he($fields['ansprechpartner']  ?? '')),
        mail_row('Mitarbeiter',      $he($fields['mitarbeiter']      ?? '')),
        '</table>',
        '<h3 style="color:#221A0E;">Nachricht</h3>',
        '<div style="background:#f9f9f9;border-left:4px solid #F07D00;padding:12px 16px;white-space:pre-wrap;">',
        $he($fields['nachricht'] ?? ''),
        '</div>',
        '<p style="margin-top:32px;font-size:12px;color:#999;">',
        'Automatisch generiert vom Kontaktformular auf genussautomaten.at',
        '</p>',
        '</body></html>',
    ]);
}

/**
 * Build a plain-text email body for a contact form submission.
 *
 * @param array<string,string> $fields  Same keys as buildContactEmailHtml().
 */
function buildContactEmailText(array $fields): string {
    return implode("\n", [
        'Neue Kontaktanfrage über die Website:',
        '',
        'Unternehmensname: ' . ($fields['unternehmensname'] ?? ''),
        'Adresse:          ' . ($fields['adresse']          ?? ''),
        'Telefon:          ' . ($fields['telefon']          ?? ''),
        'E-Mail:           ' . ($fields['email']            ?? ''),
        'Ansprechpartner:  ' . ($fields['ansprechpartner']  ?? ''),
        'Mitarbeiter:      ' . ($fields['mitarbeiter']      ?? ''),
        '',
        'Nachricht:',
        ($fields['nachricht'] ?? ''),
        '',
        '---',
        'Automatisch generiert vom Kontaktformular auf genussautomaten.at',
    ]);
}

/**
 * Send a multipart/alternative (HTML + plain-text) contact email via PHP mail().
 *
 * All header values ($fromName, $from, $replyTo, $subject) must already have
 * newlines stripped by the caller (see sanitize_header_val() in contact.php).
 *
 * TODO: When SMTP_HOST env var is configured, replace the mail() call here
 * with a proper SMTP library (e.g. PHPMailer or Symfony Mailer).
 * The function signature and callers do not need to change.
 *
 * @param string $to        Recipient address
 * @param string $subject   Mail subject (newlines already stripped)
 * @param string $htmlBody  HTML version of the message
 * @param string $textBody  Plain-text version of the message
 * @param string $fromName  Sender display name (newlines already stripped)
 * @param string $from      Sender address (newlines already stripped)
 * @param string $replyTo   Reply-To address (newlines already stripped)
 * @return bool             True if mail() accepted the message
 */
function sendContactMail(
    string $to,
    string $subject,
    string $htmlBody,
    string $textBody,
    string $fromName,
    string $from,
    string $replyTo
): bool {
    $boundary = '----=_Part_' . bin2hex(random_bytes(8));

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
    $headers .= "From: {$fromName} <{$from}>\r\n";
    $headers .= "Reply-To: {$replyTo}\r\n";
    $headers .= "X-Mailer: PHP/" . PHP_VERSION;

    $body  = "--{$boundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
    $body .= quoted_printable_encode($textBody) . "\r\n\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
    $body .= quoted_printable_encode($htmlBody) . "\r\n\r\n";
    $body .= "--{$boundary}--";

    return mail($to, $subject, $body, $headers);
}
