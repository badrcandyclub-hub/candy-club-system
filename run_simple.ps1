$content = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)

# Fix the single native alert that has an emoji
$content = $content.Replace('alert("✅ تم نسخ الصورة بنجاح! يمكنك الآن لصقها (Paste) في شات الواتساب.");', 'alert("تم نسخ الصورة بنجاح! يمكنك الآن لصقها (Paste) في شات الواتساب.");')
$content = $content.Replace('customAlert("🔔 يوجد أوردر جديد قيد التجهيز!', 'customAlert("<i class=`"fa-solid fa-bell`" style=`"color:var(--warning)`"></i> يوجد أوردر جديد قيد التجهيز!')
$content = $content.Replace('customAlert("⚠️ خطأ', 'customAlert("<i class=`"fa-solid fa-triangle-exclamation`" style=`"color:var(--danger)`"></i> خطأ')

$replacements = [ordered]@{
    "❌" = "<i class=`"fa-solid fa-xmark`"></i>"
    "⚠️" = "<i class=`"fa-solid fa-triangle-exclamation`"></i>"
    "✅" = "<i class=`"fa-solid fa-check`"></i>"
    "⏳" = "<i class=`"fa-solid fa-hourglass-half`"></i>"
    "🔔" = "<i class=`"fa-solid fa-bell`"></i>"
    "📂" = "<i class=`"fa-solid fa-folder-open`"></i>"
    "🔄" = "<i class=`"fa-solid fa-rotate`"></i>"
    "📍" = "<i class=`"fa-solid fa-location-dot`"></i>"
    "💰" = "<i class=`"fa-solid fa-money-bill-wave`"></i>"
    "✏️" = "<i class=`"fa-solid fa-pencil`"></i>"
    "🛵" = "<i class=`"fa-solid fa-motorcycle`"></i>"
    "📱" = "<i class=`"fa-solid fa-mobile-screen`"></i>"
    "📞" = "<i class=`"fa-solid fa-phone`"></i>"
    "👤" = "<i class=`"fa-solid fa-user`"></i>"
    "📦" = "<i class=`"fa-solid fa-box`"></i>"
    "💸" = "<i class=`"fa-solid fa-money-bill`"></i>"
    "🏪" = "<i class=`"fa-solid fa-store`"></i>"
    "🚚" = "<i class=`"fa-solid fa-truck-fast`"></i>"
    "⛓" = "<i class=`"fa-solid fa-link`"></i>"
    "📅" = "<i class=`"fa-regular fa-calendar-days`"></i>"
    "🗓️" = "<i class=`"fa-regular fa-calendar`"></i>"
    "🔴" = "<i class=`"fa-solid fa-circle text-danger`"></i>"
    "🟢" = "<i class=`"fa-solid fa-circle text-success`"></i>"
    "🟠" = "<i class=`"fa-solid fa-circle text-warning`"></i>"
    "🟡" = "<i class=`"fa-solid fa-circle text-warning`"></i>"
    "💬" = "<i class=`"fa-brands fa-whatsapp`"></i>"
    "📸" = "<i class=`"fa-brands fa-instagram`"></i>"
    "🔵" = "<i class=`"fa-brands fa-facebook`"></i>"
    "🎵" = "<i class=`"fa-brands fa-tiktok`"></i>"
    "⭐" = "<i class=`"fa-solid fa-star`"></i>"
    "👑" = "<i class=`"fa-solid fa-crown`"></i>"
    "🛍️" = "<i class=`"fa-solid fa-bag-shopping`"></i>"
    "🛒" = "<i class=`"fa-solid fa-cart-shopping`"></i>"
    "🎁" = "<i class=`"fa-solid fa-gift`"></i>"
    "☠️" = "<i class=`"fa-solid fa-skull`"></i>"
    "♾️" = "<i class=`"fa-solid fa-infinity`"></i>"
    "📋" = "<i class=`"fa-solid fa-clipboard`"></i>"
    "📝" = "<i class=`"fa-solid fa-file-signature`"></i>"
    "👇" = "<i class=`"fa-solid fa-hand-point-down`"></i>"
    "👁️" = "<i class=`"fa-solid fa-eye`"></i>"
    "🔓" = "<i class=`"fa-solid fa-lock-open`"></i>"
    "🔒" = "<i class=`"fa-solid fa-lock`"></i>"
    "🚀" = "<i class=`"fa-solid fa-rocket`"></i>"
    "⚙️" = "<i class=`"fa-solid fa-gear`"></i>"
    "📊" = "<i class=`"fa-solid fa-chart-column`"></i>"
    "🖨️" = "<i class=`"fa-solid fa-print`"></i>"
    "➕" = "<i class=`"fa-solid fa-plus`"></i>"
    "🔍" = "<i class=`"fa-solid fa-magnifying-glass`"></i>"
    "🌐" = "<i class=`"fa-solid fa-globe`"></i>"
    "🖼️" = "<i class=`"fa-solid fa-image`"></i>"
    "📷" = "<i class=`"fa-solid fa-camera`"></i>"
    "✖" = "<i class=`"fa-solid fa-xmark`"></i>"
    "🚨" = "<i class=`"fa-solid fa-siren-on`"></i>"
    "🛡️" = "<i class=`"fa-solid fa-shield-halved`"></i>"
    "⛔" = "<i class=`"fa-solid fa-ban`"></i>"
    "🤖" = "<i class=`"fa-solid fa-robot`"></i>"
    "🗑️" = "<i class=`"fa-solid fa-trash`"></i>"
}

foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

[System.IO.File]::WriteAllText("app.js", $content, [System.Text.Encoding]::UTF8)
Write-Host "Replaced everything successfully!"
