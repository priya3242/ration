const secretKey = "d6f573fb9cee162e2c6d9f31571546b7";
const ivString = "AP4123IMPDS@12768F";

function pkcs7Pad(input) {
    const blockSize = 16;
    const paddingLength = blockSize - (input.length % blockSize);
    const paddingChar = String.fromCharCode(paddingLength);
    return input + paddingChar.repeat(paddingLength);
}

function generateAESKey(secretKey) {
    const hashedKey = CryptoJS.SHA256(secretKey);
    return CryptoJS.enc.Hex.parse(hashedKey.toString().substr(0, 32));
}

function encryptMessage(aadharNumber) {
    const paddedInput = pkcs7Pad(aadharNumber);
    const aesKey = generateAESKey(secretKey);
    const iv = CryptoJS.enc.Utf8.parse(ivString.substr(0, 16));

    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(paddedInput), aesKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.NoPadding
    });

    const firstBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
    return btoa(firstBase64);
}

async function encryptAndSend() {
    const aadharNumber = document.getElementById("aadharNumber").value;
    if (!aadharNumber) {
        alert("Please enter a valid Aadhar number.");
        return;
    }

    document.getElementById("loadingMessage").style.display = "block";

    const encryptedAadhar = encryptMessage(aadharNumber);

    const payload = {
        id: encryptedAadhar,
        idType: "U",
        userName: "IMPDS",
        token: "91f01a0a96c526d28e4d0c1189e80459",
        sessionId: "2820241208221029"
    };

    const newUserAgent = "Mozilla/5.0 (Linux; Android 11; Samsung Galaxy S21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36";

    try {
        const response = await fetch("https://impds.nic.in/impdsmobileapi/api/getrationcard", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": newUserAgent,
                "Host": "impds.nic.in",
                "Connection": "Keep-Alive",
                "Accept-Encoding": "gzip"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();

        if (responseData.respCode === "214") {
            alert("Error: Ration card not found for the provided Aadhar number.");
            document.getElementById("responseOutput").style.display = "none";
            return;
        }

        if (!responseData || Object.keys(responseData).length === 0) {
            throw new Error("API response is empty or does not contain valid data.");
        }

        displayResponse(responseData);

    } catch (error) {
        document.getElementById("responseOutput").innerHTML = `<p class="error">Error: ${error.message}</p>`;
        document.getElementById("responseOutput").style.display = "block";
    } finally {
        document.getElementById("loadingMessage").style.display = "none";
    }
}

function displayResponse(responseData) {
    const members = responseData.memberDetailsList || [];
    let output = `
        <tr><th>State</th><td>${responseData.homeStateName} (${responseData.homeStateCode})</td></tr>
        <tr><th>District</th><td>${responseData.homeDistName} (${responseData.districtCode})</td></tr>
        <tr><th>Ration Card ID</th><td>${responseData.rcId}</td></tr>
        <tr><th>FPS ID</th><td>${responseData.fpsId}</td></tr>
        <tr><th>Scheme</th><td>${responseData.schemeName} (${responseData.schemeId})</td></tr>
        <tr><th>Allowed ONORC</th><td>${responseData.allowed_onorc}</td></tr>
        <tr><th>Duplicate UID Status</th><td>${responseData.dup_uid_status}</td></tr>
        <tr><th>Address</th><td>${responseData.address}</td></tr>
        <tr><th>Number of Members</th><td>${members.length}</td></tr>
    `;

    members.forEach(member => {
        output += `
            <tr><th>Member ID</th><td>${member.memberId}</td></tr>
            <tr><th>Member Name</th><td>${member.memberName}</td></tr>
            <tr><th>UID</th><td>${member.uid}</td></tr>
            <tr><th>Relationship Code</th><td>${member.relationship_code}</td></tr>
            <tr><th>Relationship Name</th><td>${member.releationship_name}</td></tr>
            <tr><td colspan="2"><hr></td></tr>
        `;
    });

    document.getElementById("responseTable").innerHTML = output;
    document.getElementById("responseOutput").style.display = "block";
}
