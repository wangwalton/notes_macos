const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {app} = require('electron');
// Assuming the public key is in the same directory as this script
const publicKeyLocation = app.isPackaged ? path.join(process.resourcesPath, "assets") + '/public_key.pem' : "assets/public_key.pem";

function getPublicKey() {
    const publicKeyPem = fs.readFileSync(publicKeyLocation, 'utf-8');
    return crypto.createPublicKey(publicKeyPem);
}

function verify(message, signatureBase64) {
    const publicKey = getPublicKey();

    try {
        const signatureBuffer = Buffer.from(signatureBase64, 'base64');
        const isVerified = crypto.verify(
            'sha256',
            Buffer.from(message),
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                // You may need to adjust saltLength based on your Python code's configuration
                saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
            },
            signatureBuffer
        );

        return isVerified;
    } catch (error) {
        console.error('Verification failed:', error);
        return false;
    }
}

module.exports = {verify}

const message = 'hello';
const signatureBase64 = 'd6zhy3nZaPKonzu5WjAQRyuHwzmgOwLnRKiLyFUTy8FRtvUpZF0nrrPi2xGmXplWbVKLjXa71tf4ASFGtfe6RTPuQXJDnsTZ+qBGKzUMYuDU/n9Y1r2ZROgjk0S6HSzN0dcyQ9ZYTOLBkhiwVjH7IAndbsZn6edP9vG5XQdLyn0Aj+dOlUPvzOYBDCckqdJvAsFKoNmbITEHRqTAFHERBQ21MS4yQw7avtUzs5MtwqQ3SKVmoa1uji1idmGLFcuBB0u2gQNU7kxl+VhrhZhh1oRViVksuSBHBk1UC9bav50DH9CmzN02xfAqnLKck1pICYddmKtnfMhScdF0T2ggHA==';
const isMessageVerified = verify(message, signatureBase64);
console.log('Is message verified:', isMessageVerified);