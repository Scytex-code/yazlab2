import { fetchData } from './api.js';

const mainContent = document.getElementById('main-content');

/**
 * @param {number} userId 
 */
export const renderProfilePage = async (userId) => {
    mainContent.innerHTML = `
        <h2 id="profile-name">Profil Yükleniyor...</h2>
        <div id="profile-stats"></div>
        <div id="follow-container"></div>
        <div id="profile-content"></div>
        <p id="profile-status"></p>
    `;
    const profileStatus = document.getElementById('profile-status');

    try {
        const response = await fetchData(`profile/user/${userId}/`); 
        
        const userDetails = response.user_details || {}; 
        
        const stats = response.stats || { followers: 0, following: 0 }; 
        const profileStatusData = response.profile_status || { is_owner: false, is_following: false };

        const firstName = userDetails.first_name || 'İsimsiz';
        const lastName = userDetails.last_name || '';
        const username = userDetails.username || 'Kullanıcı'; // ⭐ USERNAME BURADAN GELİYOR
        const email = userDetails.email || 'bilgi@yok';
        
        document.getElementById('profile-name').textContent = `${firstName} ${lastName} (@${username})`;
        
        document.getElementById('profile-stats').innerHTML = `
            <p><strong>Takipçi:</strong> ${stats.followers} | <strong>Takip Edilen:</strong> ${stats.following}</p>
            <p><strong>E-posta:</strong> ${email}</p>
        `;

        // ⭐ GÜNCELLEME 1: renderFollowButton'a username'i iletiyoruz
        renderFollowButton(userId, username, profileStatusData.is_owner, profileStatusData.is_following);
        
        document.getElementById('profile-content').innerHTML = `
            <h3>Son Aktivite</h3>
            <p>Kullanıcının son aktiviteleri Feed API'si ile buraya getirilebilir.</p>
        `;

    } catch (error) {
        profileStatus.textContent = `Profil yüklenemedi: API isteği başarısız: ${error.message}`;
    }
};

// ----------------------------------------------------------------------

/**
 * @param {number} targetUserId 
 * @param {string} targetUsername // ⭐ YENİ PARAMETRE
 * @param {boolean} isOwner 
 * @param {boolean} isFollowing
 */
function renderFollowButton(targetUserId, targetUsername, isOwner, isFollowing) {
    const followContainer = document.getElementById('follow-container');
    
    if (isOwner) {
        followContainer.innerHTML = '<button onclick="window.location.hash=\'#profile/me/update\'">Profili Düzenle</button>';
        return;
    }

    const buttonText = isFollowing ? 'Takipten Çık' : 'Takip Et';
    followContainer.innerHTML = `<button id="follow-btn" class="${isFollowing ? 'unfollow-btn' : 'follow-btn'}">${buttonText}</button>`;
    
    document.getElementById('follow-btn')?.addEventListener('click', async () => {
        const method = isFollowing ? 'DELETE' : 'POST';
        const endpoint = 'follows/'; 
        const data = { following: targetUserId }; 

        try {
            if (method === 'POST') {
                await fetchData(endpoint, 'POST', data);
                // ⭐ GÜNCELLEME 2: Kullanıcı adını kullan
                alert(`@${targetUsername} kullanıcısı takip edildi!`); 
            } else {
                // Takipten çıkma mantığı (ID bulma)
                const followsList = await fetchData(endpoint); 
                
                const followToDelete = followsList.results.find(follow => {
                    return parseInt(follow.following) === parseInt(targetUserId); 
                });

                if (!followToDelete) {
                    alert("Takip kaydı bulunamadı. Zaten takibi bırakmış olabilirsiniz."); 
                    return; 
                }
                
                const followId = followToDelete.id;
                await fetchData(`follows/${followId}/`, 'DELETE', null);
                
                // ⭐ GÜNCELLEME 3: Kullanıcı adını kullan
                alert(`@${targetUsername} kullanıcısı takipten çıkarıldı!`); 
            }
            
            window.location.reload(); 

        } catch (error) {
            console.error("Takip/Takipten Çıkma Hatası:", error);
            alert(`İşlem başarısız: ${error.message}`);
        }
    });
}

// ----------------------------------------------------------------------

const handleProfileUpdate = async (e, userId) => {
    e.preventDefault();
    const statusDiv = document.getElementById('update-status');
    statusDiv.textContent = 'Güncelleniyor...';
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        await fetchData(`profile/user/${userId}/`, 'PATCH', data);
        
        statusDiv.style.color = 'green';
        statusDiv.textContent = 'Profil başarıyla güncellendi!';
        
        setTimeout(() => {
             window.location.hash = `#profile/${userId}`;
        }, 1500);

    } catch (error) {
        statusDiv.style.color = 'red';
        const errorMessage = error.message.includes('JSON') ? JSON.stringify(error.data) : error.message;
        statusDiv.textContent = `Güncelleme başarısız: ${errorMessage}`;
    }
};

export const renderProfileUpdatePage = async (userId) => {
    mainContent.innerHTML = `
        <h2 class="form-title">Profil Bilgilerini Düzenle</h2>
        <form id="profile-update-form" class="auth-form">
            <div id="update-status" style="color: red; margin-bottom: 15px;"></div>
            
            <label for="update-first-name">Adınız:</label>
            <input type="text" id="update-first-name" name="first_name" required>

            <label for="update-last-name">Soyadınız:</label>
            <input type="text" id="update-last-name" name="last_name" required>

            <label for="update-email">E-posta:</label>
            <input type="email" id="update-email" name="email" required>
            
            <label for="update-username">Kullanıcı Adı:</label>
            <input type="text" id="update-username" name="username" required>
            
            <button type="submit" id="update-submit-btn">Kaydet ve Güncelle</button>
            <button type="button" onclick="window.location.hash='#profile/${userId}'" class="back-btn">İptal</button>
        </form>
    `;

    const statusDiv = document.getElementById('update-status');
    const form = document.getElementById('profile-update-form');

    try {
        const response = await fetchData(`profile/user/${userId}/`);
        const userDetails = response.user_details || {};

        document.getElementById('update-first-name').value = userDetails.first_name || '';
        document.getElementById('update-last-name').value = userDetails.last_name || '';
        document.getElementById('update-email').value = userDetails.email || '';
        document.getElementById('update-username').value = userDetails.username || '';

        form.addEventListener('submit', (e) => handleProfileUpdate(e, userId));

    } catch (error) {
        statusDiv.textContent = `Mevcut profil bilgileri yüklenemedi: ${error.message}`;
    }
};