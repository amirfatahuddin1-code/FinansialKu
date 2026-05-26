Deno.serve(async (req) => {
    try {
        const url = new URL(req.url)
        const redirectUri = url.searchParams.get('redirect_uri')
        const orderId = url.searchParams.get('order_id') || ''
        const statusCode = url.searchParams.get('status_code') || ''
        const transactionStatus = url.searchParams.get('transaction_status') || ''

        if (!redirectUri) {
            return new Response('Missing redirect_uri parameter', { status: 400 })
        }

        // Construct target deep link redirect URL
        // We append the payment parameters back so the app can parse them if needed
        const separator = redirectUri.includes('?') ? '&' : '?'
        const targetAppUrl = `${redirectUri}${separator}order_id=${encodeURIComponent(orderId)}&status_code=${encodeURIComponent(statusCode)}&transaction_status=${encodeURIComponent(transactionStatus)}`

        // Premium HTML Page with glassmorphism, nice fonts, and micro-interactions
        const html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pembayaran Selesai | Karsafin</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: radial-gradient(circle at 10% 20%, rgb(18, 16, 28) 0%, rgb(10, 10, 14) 90%);
            color: #ffffff;
            padding: 20px;
        }
        .container {
            position: relative;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px 30px;
            text-align: center;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .success-icon-wrapper {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 28px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .success-icon-bg {
            position: absolute;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 70%);
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 0.9; }
            100% { transform: scale(0.9); opacity: 0.6; }
        }
        .success-icon {
            width: 56px;
            height: 56px;
            background: #10b981;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            z-index: 2;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 12px 0;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            margin: 0 0 32px 0;
        }
        .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            padding: 14px 28px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            border: none;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            width: 100%;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            background: linear-gradient(135deg, #6c5dd3 0%, #5a4cd0 100%);
        }
        .btn:active {
            transform: translateY(0);
        }
        .loader-bar {
            width: 100%;
            height: 3px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 2px;
            margin-top: 24px;
            overflow: hidden;
        }
        .loader-progress {
            width: 0%;
            height: 100%;
            background: #6366f1;
            border-radius: 2px;
            animation: load 2.5s forwards;
        }
        @keyframes load {
            0% { width: 0%; }
            100% { width: 100%; }
        }
    </style>
    <script>
        window.onload = function() {
            const targetUrl = "${targetAppUrl}";
            console.log("Redirecting to: " + targetUrl);
            
            // Auto-redirect to app deep link after a small delay
            setTimeout(function() {
                window.location.href = targetUrl;
            }, 800);
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="success-icon-wrapper">
            <div class="success-icon-bg"></div>
            <div class="success-icon">✓</div>
        </div>
        <h1>Pembayaran Diproses</h1>
        <p>Terima kasih! Pembayaran Anda sedang diproses. Anda akan dialihkan kembali ke aplikasi Karsafin secara otomatis dalam beberapa saat...</p>
        
        <a href="${targetAppUrl}" class="btn">Kembali ke Aplikasi</a>
        
        <div class="loader-bar">
            <div class="loader-progress"></div>
        </div>
    </div>
</body>
</html>
`

        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 200
        })

    } catch (error: any) {
        console.error('Callback handling error:', error)
        return new Response(`Error: ${error.message}`, { status: 500 })
    }
})
