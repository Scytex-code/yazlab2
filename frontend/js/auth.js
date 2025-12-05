import { fetchData } from './api.js';

const mainContent = document.getElementById('main-content');

export const saveToken = (token) => {
    localStorage.setItem('auth_token', token); 
};

export const saveUserId = (userId) => {
    localStorage.setItem('user_id', userId);
}

export const getToken = () => {
    return localStorage.getItem('auth_token');
};

export const getUserId = () => {
    const userId = localStorage.getItem('user_id');
    return userId ? parseInt(userId) : null; 
};


/**
 * @param {object} error 
 * @returns {string} 
 */
const getDetailedErrorMessage = (error) => {
    const errorData = error.data; 
    
    if (errorData) {
        if (errorData.error) {
            return errorData.error;
        }
        if (errorData.username || errorData.email || errorData.password || errorData.password2 || errorData.non_field_errors) {
            let messages = [];
            if (errorData.username) messages.push(`Kullanıcı Adı: ${errorData.username.join(' ')}`);
            if (errorData.email) messages.push(`E-posta: ${errorData.email.join(' ')}`);
            if (errorData.password) messages.push(`Şifre: ${errorData.password.join(' ')}`);
            if (errorData.non_field_errors) messages.push(`Hata: ${errorData.non_field_errors.join(' ')}`);
            return messages.join(' | ');
        }
        if (errorData.detail) {
             return errorData.detail; 
        }
    }
    return error.message || "Bilinmeyen bir hata oluştu.";
}


export const logout = async (redirect = false) => {
    try {
        await fetchData('auth/logout/', 'POST', null, true); 
    } catch (error) {
        console.warn("Backend çıkış hatası, yerel token temizleniyor.");
    } finally {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id'); 
        if (redirect) {
            window.location.hash = '#login';
            window.location.reload(); 
        }
    }
};

export const renderLoginPage = () => {
    mainContent.innerHTML = `
        <div class="auth-container">
            <h2>Giriş Yap</h2>
            <form id="login-form">
                <input type="text" id="username" placeholder="Kullanıcı Adı" required>
                <input type="password" id="password" placeholder="Şifre" required>
                <button type="submit">Giriş Yap</button>
                <p class="error-message" id="login-error"></p>
                <p><a href="#register">Hesabın yok mu? Kayıt ol.</a></p>
                <p><a href="#reset-password">Şifremi Unuttum</a></p>
            </form>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        const errorElement = document.getElementById('login-error');
        errorElement.textContent = '';

        try {
            const result = await fetchData('auth/login/', 'POST', { username, password }, false); 

            saveToken(result.key);

            let userIdToSave = null;

            if (result.user && result.user.pk) {
                userIdToSave = result.user.pk;
            } else if (result.id) {
                userIdToSave = result.id;
            }else if (result.user_id) {
                userIdToSave = result.user_id;
            }

            if (userIdToSave) {
                saveUserId(userIdToSave);
            } else {
                console.warn("Kullanıcı ID'si (pk, id veya user_id) giriş cevabında bulunamadı. Lütfen Backend yanıt formatını kontrol edin.");
            }

            window.location.hash = '#feed'; 
        } catch (error) {

            errorElement.textContent = getDetailedErrorMessage(error);
        }
    });
};

export const renderRegisterPage = () => {
    mainContent.innerHTML = `
        <div class="auth-container">
            <h2>Kayıt Ol</h2>
            <form id="register-form">
                <input type="text" id="username" placeholder="Kullanıcı Adı" required>
                <input type="email" id="email" placeholder="E-posta" required>
                <input type="text" id="first_name" placeholder="Adınız" required>
                <input type="text" id="last_name" placeholder="Soyadınız" required>
                <input type="password" id="password" placeholder="Şifre" required>
                <input type="password" id="password2" placeholder="Şifre Tekrar" required>
                <button type="submit">Kayıt Ol</button>
                <p class="error-message" id="register-error"></p>
                <p><a href="#login">Zaten bir hesabın var mı? Giriş Yap.</a></p>
            </form>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            username: e.target.username.value,
            email: e.target.email.value,
            first_name: e.target.first_name.value,
            last_name: e.target.last_name.value,
            password: e.target.password.value,
            password2: e.target.password2.value,
            password1: e.target.password.value 
        };
        const errorElement = document.getElementById('register-error');
        errorElement.textContent = '';

        try {
            await fetchData('auth/registration/', 'POST', data, false);
            alert("Kayıt başarılı! Lütfen giriş yapın.");
            window.location.hash = '#login'; 
        } catch (error) {

            errorElement.textContent = getDetailedErrorMessage(error);
        }
    });
};

export const renderResetPasswordPage = () => {
    mainContent.innerHTML = `
        <div class="auth-container">
            <h2>Şifre Sıfırlama İsteği</h2>
            <p>Hesabınızla ilişkili e-posta adresinizi girin. Size bir sıfırlama linki göndereceğiz.</p>
            <form id="reset-password-request-form">
                <input type="email" id="reset-email" placeholder="E-posta Adresi" required>
                <button type="submit">Sıfırlama Linki Gönder</button>
                <p class="status-message" id="reset-status"></p>
                <p><a href="#login">Giriş sayfasına geri dön.</a></p>
            </form>
        </div>
    `;

    document.getElementById('reset-password-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target['reset-email'].value;
        const statusElement = document.getElementById('reset-status');
        statusElement.textContent = 'İşleniyor...';
        statusElement.style.color = 'black';

        try {
            const result = await fetchData('auth/password/reset/', 'POST', { email }, false);
            
            statusElement.textContent = result.detail;
            statusElement.style.color = 'green';
            
        } catch (error) {
            statusElement.textContent = getDetailedErrorMessage(error);
            statusElement.style.color = 'red';
        }
    });
};

export const renderResetPasswordConfirmPage = (uid, token) => {
    mainContent.innerHTML = `
        <div class="auth-container">
            <h2>Yeni Şifre Belirle</h2>
            <p>Lütfen ${uid} ve ${token} için yeni şifrenizi girin.</p>
            <form id="reset-password-confirm-form">
                <input type="password" id="new_password1" placeholder="Yeni Şifre" required>
                <input type="password" id="new_password2" placeholder="Yeni Şifre Tekrarı" required>
                <button type="submit">Şifreyi Sıfırla</button>
                <p class="status-message" id="confirm-status"></p>
            </form>
        </div>
    `;

    document.getElementById('reset-password-confirm-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const new_password1 = e.target.new_password1.value;
        const new_password2 = e.target.new_password2.value;
        const statusElement = document.getElementById('confirm-status');
        statusElement.textContent = 'Sıfırlanıyor...';
        statusElement.style.color = 'black';

        try {
            await fetchData('auth/password/reset/confirm/', 'POST', { 
                uid, 
                token, 
                new_password1, 
                new_password2 
            }, false);
            
            statusElement.textContent = 'Şifreniz başarıyla sıfırlandı. Giriş yapabilirsiniz.';
            statusElement.style.color = 'green';
            setTimeout(() => { window.location.hash = '#login'; }, 2000);

        } catch (error) {
            statusElement.textContent = getDetailedErrorMessage(error);
            statusElement.style.color = 'red';
        }
    });
};


export const handleLogout = () => {
    logout(true); 
};