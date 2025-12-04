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

// 🌟 YENİ FONKSİYON: content.js için gerekli
export const getUserId = () => {
    const userId = localStorage.getItem('user_id');
    // Sayısal karşılaştırma için döndürüyoruz
    return userId ? parseInt(userId) : null; 
};


/**
 * @param {boolean} redirect 
 */
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
            } else if (result.user_id) {
                 userIdToSave = result.user_id;
            }
            
            if (userIdToSave) {
                saveUserId(userIdToSave);
            } else {
                console.warn("Kullanıcı ID'si (pk, id veya user_id) giriş cevabında bulunamadı. Lütfen Backend yanıt formatını kontrol edin.");
            }
            
            window.location.hash = '#feed'; 
        } catch (error) {
            errorElement.textContent = `Giriş başarısız: ${error.message}`;
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
            errorElement.textContent = `Kayıt başarısız: ${error.message}`;
        }
    });
};

export const handleLogout = () => {
    logout(true); 
};