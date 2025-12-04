import { fetchData } from './api.js';

const mainContent = document.getElementById('main-content');

export const renderLibraryPage = async () => {
    mainContent.innerHTML = `
        <h2>Kütüphanem (Listelerim)</h2>
        <p id="library-status">Listeleriniz yükleniyor...</p>
        <button id="create-list-btn">Yeni Liste Oluştur</button>
        <div id="user-lists" class="list-grid"></div>
    `;
    const libraryStatus = document.getElementById('library-status');
    const userListsElement = document.getElementById('user-lists');

    try {
        const listsResponse = await fetchData('lists/'); 
        const lists = listsResponse.results || []; 
        libraryStatus.style.display = 'none';

        if (lists.length === 0) {
            userListsElement.innerHTML = '<p class="info-message">Henüz hiç liste oluşturmadınız.</p>';
            return;
        }

        let html = '';
        lists.forEach(list => {
            const itemCount = list.items ? list.items.length : 0; 
            
            html += `
                <div class="list-card" data-list-id="${list.id}">
                    <h3>${list.name} (<span id="list-count-value-${list.id}">${itemCount}</span> içerik)</h3>
                    <p>Liste ID: ${list.id}</p>
                    <button class="view-list-btn" onclick="window.location.hash='#list/${list.id}'">Listeyi Gör</button>
                    </div>
            `;
        });
        
        userListsElement.innerHTML = html;

    } catch (error) {
        libraryStatus.textContent = `Listeler yüklenemedi: ${error.message}`;
    }
    
    document.getElementById('create-list-btn')?.addEventListener('click', () => {
        showCreateListModal();
    });
};

const showCreateListModal = async () => {
    const listName = prompt("Oluşturmak istediğiniz listenin adını girin:");
    if (!listName) return;

    try {
        await fetchData('lists/', 'POST', { name: listName, is_public: true }); 
        alert(`Liste "${listName}" başarıyla oluşturuldu!`);
        window.location.reload(); 
    } catch (error) {
        alert(`Liste oluşturma başarısız: ${error.message}`);
    }
};

/**
 * @param {string} contentType 
 * @param {number} objectId 
 */
export const openListModal = async (contentType, objectId) => {
    const modalHtml = `
        <div id="list-modal" class="modal">
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h3>Listelerinize Ekle/Çıkar</h3>
                <p>İçerik ID: **${objectId}** (${contentType.toUpperCase()})</p>
                <div id="user-lists-container">
                    <p>Listeler yükleniyor...</p>
                </div>
                <p id="list-status" class="status-message"></p>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('list-modal');
    const closeBtn = modal.querySelector('.close-btn');

    modal.style.display = 'block';

    closeBtn.onclick = function() {
        modal.style.display = 'none';
        modal.remove(); 
    };
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            modal.remove();
        }
    };
    
    const listsContainer = document.getElementById('user-lists-container');
    
    try {
        const listsResponse = await fetchData('lists/'); 
        let lists = listsResponse.results || [];

        const isBook = contentType.toLocaleLowerCase('tr') === 'book';

        lists = lists.filter(list => {
            const listName = list.name.toLocaleLowerCase('tr');
            
            if (isBook) {
                if (listName.includes('izle') || listName.includes('movie')) {
                    return false;
                }
            } else {
                if (listName.includes('oku') || listName.includes('kitap') || listName.includes('book')) {
                    return false;
                }
            }
            return true;
        });
        
        if (!lists || lists.length === 0) {
            listsContainer.innerHTML = '<p>Bu içeriğe uygun oluşturulmuş bir listeniz bulunmamaktadır.</p>';
            return;
        }

        let listsHtml = '';
        for (const list of lists) {
            const listDetail = await fetchData(`lists/${list.id}/`);
            
            const isListed = listDetail.items.some(item => {
                return item.content_details && parseInt(item.content_details.id) === parseInt(objectId);
            });
            
            const buttonText = isListed ? 'Listeden Çıkar' : 'Listeye Ekle';
            const buttonClass = isListed ? 'btn-remove' : 'btn-add';

            listsHtml += `
                <div class="list-item-control">
                    <span>${listDetail.name} (${listDetail.items.length})</span>
                    <button class="${buttonClass}" data-list-id="${list.id}" data-action="${isListed ? 'remove' : 'add'}">${buttonText}</button>
                </div>
            `;
        }
        
        listsContainer.innerHTML = listsHtml;
        
        listsContainer.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                handleListAction(button, contentType, objectId);
            });
        });

    } catch (error) {
        listsContainer.innerHTML = `<p class="error-message">Listeler yüklenemedi veya kontrol edilemedi: ${error.message}</p>`;
        console.error("List Modal Hatası:", error);
    }
};

const handleListAction = async (button, contentType, objectId) => {
    const listId = button.dataset.listId;
    const action = button.dataset.action;
    const statusElement = document.getElementById('list-status');
    
    statusElement.textContent = 'İşleniyor...';
    
    const listCountSpanElement = document.getElementById(`list-count-value-${listId}`); 
    
    try {
        if (action === 'add') {
            await fetchData('listitems/', 'POST', {
                list: parseInt(listId),
                content_type: contentType.toLowerCase(),
                object_id: parseInt(objectId)
            });
            
            statusElement.textContent = 'Listeye başarıyla eklendi!';
            
            if (listCountSpanElement) {
                 const currentCount = parseInt(listCountSpanElement.textContent);
                 listCountSpanElement.textContent = currentCount + 1; 
            }
            
            button.textContent = 'Listeden Çıkar';
            button.dataset.action = 'remove';
            button.className = 'btn-remove';
            
        } else { 
            
            const listDetail = await fetchData(`lists/${listId}/`);
            const itemToRemove = listDetail.items.find(item => 
                item.content_details && 
                parseInt(item.content_details.id) === parseInt(objectId)
            );
            
            if (!itemToRemove) {
                throw new Error("Çıkarılacak içerik listede bulunamadı.");
            }
            
            const itemId = itemToRemove.id;
            
            await fetchData(`listitems/${itemId}/`, 'DELETE', null);
            
            statusElement.textContent = 'Listeden başarıyla çıkarıldı!';
            
            if (listCountSpanElement) {
                 const currentCount = parseInt(listCountSpanElement.textContent);
                 listCountSpanElement.textContent = currentCount - 1; 
            }

            button.textContent = 'Listeye Ekle';
            button.dataset.action = 'add';
            button.className = 'btn-add';
        }

        statusElement.style.color = 'green';
        setTimeout(() => { statusElement.textContent = ''; }, 1000);

    } catch (error) {
        statusElement.textContent = `Hata: ${error.message}`;
        statusElement.style.color = 'red';
    }
}

/**
 * @param {number} listId 
 */
export const renderListDetailPage = async (listId) => {
    mainContent.innerHTML = `
        <h2 id="list-detail-title">Liste Yükleniyor...</h2>
        <p id="list-detail-description"></p>
        <div id="list-items" class="content-grid"></div>
        <p id="list-detail-status"></p>
    `;
    const listItemsElement = document.getElementById('list-items');
    const statusElement = document.getElementById('list-detail-status');

    try {
        const list = await fetchData(`lists/${listId}/`);
        document.getElementById('list-detail-title').textContent = list.name;
        document.getElementById('list-detail-description').textContent = ''; 

        const listItems = list.items || [];
        
        if (listItems.length === 0) {
            listItemsElement.innerHTML = '<p>Bu listede henüz içerik yok.</p>';
            return;
        }
        
        // library.js içinde, renderListDetailPage fonksiyonunda

        let html = listItems.map(item => { 
            const content = item.content_details; 
 
            // 🌟 GÜNCELLEME: ContentType adı genelde büyük harfle gelir (Book/Movie). 
            // Eğer Serileştiriciniz bu bilgiyi ContentType ID'si olarak değil de Model Adı olarak döndürüyorsa, 
            // bunu küçük harfe dönüştürerek URL'ye güvenli şekilde gönderin.
            const type = (content.content_type || 'Bilinmiyor').toLowerCase(); // 🌟 content.js'in beklediği formata zorla

            const coverUrl = content.poster_path || content.cover_url || 'placeholder.png';
            const creator = content.authors || content.director || 'Bilinmiyor';

            return `
                <div class="content-card">
                    <h3><a href="#content/${type}/${content.id}">${content.title}</a></h3> 
                    <p>${type.charAt(0).toUpperCase() + type.slice(1)}: ${creator}</p> 
                    <button class="remove-list-item" data-item-id="${item.id}">Listeden Çıkar</button>
                    <div class="card-image-container">
                     <img src="${coverUrl}" alt="${content.title} Kapak" onerror="this.onerror=null;this.src='placeholder.png';" />
                     </div>
                </div>
            `;
        }).join('');

        listItemsElement.innerHTML = html;

        listItemsElement.querySelectorAll('.remove-list-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                if (confirm('Bu içeriği listeden çıkarmak istediğinizden emin misiniz?')) {
                    removeContentFromList(itemId, listId);
                }
            });
        });

    } catch (error) {
        statusElement.textContent = `Liste detayları yüklenemedi: ${error.message}`;
        console.error("Liste Detay Hatası:", error); 
    }
};

const removeContentFromList = async (itemId, listId) => {
    try {
        await fetchData(`listitems/${itemId}/`, 'DELETE', null);
        alert("İçerik listeden başarıyla çıkarıldı.");
        renderListDetailPage(listId); 
    } catch (error) {
        alert(`Listeden çıkarma başarısız: ${error.message}`);
    }
};