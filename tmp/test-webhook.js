const payload = {
    event: { received: "payment.received" },
    data: {
        id: "a3cc4a69-10f2-433b-b80d-1b57f2a8fdb7",
        status: true,
        extraData: {
            noCustomer: "77567c8d-67d9-4cb6-9a13-430d373b7db5",
            idProd: "pro_3m"
        }
    }
};

fetch("https://neeawjydtdcubwrklnua.supabase.co/functions/v1/mayar-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
})
    .then(r => r.json().then(data => ({ status: r.status, data })))
    .then(res => console.log(JSON.stringify(res, null, 2)))
    .catch(e => console.error(e));
