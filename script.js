const app = {
    CLIENT_ID: "1004388657829-mvpott95dsl5bapu40vi2n5li7i7t7d1.apps.googleusercontent.com",
    REDIRECT_URI: "https://noharashiroi.github.io/ipadmini1/",
    SCOPES: "https://www.googleapis.com/auth/photoslibrary.readonly",
    accessToken: localStorage.getItem("access_token") || null,
    albumId: null,
    photos: [],
    currentPhotoIndex: 0,
    nextPageToken: null,
    slideshowInterval: null,
    slideshowSpeed: 3000, // 默认速度（毫秒）
    isSlideshowPlaying: false,
   getAccessToken: function() {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.has("access_token")) {
            this.accessToken = hashParams.get("access_token");
            sessionStorage.setItem("access_token", this.accessToken);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (this.accessToken) {
            document.getElementById("auth-container").style.display = "none";
            document.getElementById("app-container").style.display = "flex";
            this.fetchAlbums();
            this.loadPhotos();
        } else {
            document.getElementById("auth-container").style.display = "flex";
            document.getElementById("app-container").style.display = "none";
        }
    },

    authorizeUser: function() {
        const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${this.CLIENT_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&response_type=token&scope=${this.SCOPES}&prompt=consent`;
        window.location.href = authUrl;
    },
    openOAuthPopup: function() {
        const width = 500;
        const height = 600;

        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);
        const oauthWindow = window.open(
            `https://accounts.google.com/o/oauth2/auth?client_id=${this.CLIENT_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&response_type=token&scope=${this.SCOPES}&prompt=consent`,
            'OAuthPopup',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,noopener`
        );

        window.addEventListener("message", this.handleOAuthResponse.bind(this), false);
    },

    handleOAuthResponse: function(event) {
        if (event.origin !== this.REDIRECT_URI) {
            return;
        }
        const { data } = event;
        // 确保返回的数据是有效的 Token
        if (data && data.access_token) {
            this.accessToken = data.access_token;
            localStorage.setItem("access_token", this.accessToken);
            document.getElementById("auth-container").style.display = "none";
            document.getElementById("app-container").style.display = "flex";
            this.fetchAlbums();
            this.loadPhotos();
            document.getElementById("logout-btn").style.display = "block";
        }
    },

    logoutGoogle: function() {
        localStorage.removeItem("access_token");
        this.accessToken = null;
        document.getElementById("auth-container").style.display = "flex";
        document.getElementById("app-container").style.display = "none";
        document.getElementById("logout-btn").style.display = "none";
    },


    fetchAlbums: function() {
        if (!this.accessToken) return;
        const url = "https://photoslibrary.googleapis.com/v1/albums?pageSize=50";

        fetch(url, {
            method: "GET",
            headers: { "Authorization": "Bearer " + this.accessToken }
        })
        .then(response => response.json())
        .then(data => {
            if (data.albums) {
                this.renderAlbumList(data.albums);
            } else {
                console.error("No albums found in the response.");
            }
        })
        .catch(error => {
            console.error("Error fetching albums:", error);
        });
    },

    renderAlbumList: function(albums) {
        const albumSelect = document.getElementById("album-select");
        albumSelect.innerHTML = '<option value="all">所有相片</option>'; 
        albums.forEach(album => {
            const option = document.createElement("option");
            option.value = album.id;
            option.textContent = album.title;
            albumSelect.appendChild(option);
        });
    },

    loadPhotos: function() {
        const albumSelect = document.getElementById("album-select");
        this.albumId = albumSelect.value === "all" ? null : albumSelect.value;

        this.photos = [];
        this.nextPageToken = null;
        const photoContainer = document.getElementById("photo-container");
        photoContainer.innerHTML = ''; // 清空照片显示区

        if (this.albumId) {
            this.fetchPhotos();
        } else {
            this.fetchAllPhotos(); 
        }
    },

    fetchAllPhotos: function() {
        const url = "https://photoslibrary.googleapis.com/v1/mediaItems:search";

        const body = {
            pageSize: 50,
            pageToken: this.nextPageToken || ''
        };

        fetch(url, {
            method: "POST",
            headers: { "Authorization": "Bearer " + this.accessToken, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        .then(response => response.json())
        .then(data => {
            if (data.mediaItems) {
                this.photos = [...new Map(this.photos.concat(data.mediaItems).map(item => [item.id, item])).values()];
                this.nextPageToken = data.nextPageToken;
                this.renderPhotos();
            } else {
                console.error("No mediaItems found in the response.");
            }
        })
        .catch(error => {
            console.error("Error fetching photos:", error);
        });
    },

    fetchPhotos: function() {
        const url = "https://photoslibrary.googleapis.com/v1/mediaItems:search";
        const body = {
            albumId: this.albumId,
            pageSize: 50
        };

        fetch(url, {
            method: "POST",
            headers: { "Authorization": "Bearer " + this.accessToken, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        .then(response => response.json())
        .then(data => {
            if (data.mediaItems) {
                this.photos = [...new Map(data.mediaItems.map(item => [item.id, item])).values()];
                this.renderPhotos();
            } else {
                console.error("No mediaItems found in the response.");
            }
        })
        .catch(error => {
            console.error("Error fetching photos:", error);
        });
    },

    renderPhotos: function() {
        const photoContainer = document.getElementById("photo-container");
        if (!photoContainer) {
            console.error('Photo container not found.');
            return; 
        }

        photoContainer.innerHTML = '';  

        if (this.photos.length === 0) {
            photoContainer.innerHTML = "<p>此相簿沒有照片</p>";
        } else {
            this.photos.forEach((photo, index) => {
                const img = document.createElement("img");
                img.src = `${photo.baseUrl}=w600-h400`;
                img.alt = "Photo";
                img.classList.add("photo");
                img.onclick = () => this.openLightbox(index);
                photoContainer.appendChild(img);
            });
        }

        photoContainer.style.display = "grid";
        document.getElementById("app-container").style.display = "flex"; 
    },

    openLightbox: function(index) {
        this.currentPhotoIndex = index;
        const lightbox = document.getElementById("lightbox");
        const lightboxImage = document.getElementById("lightbox-image");
        lightboxImage.src = `${this.photos[index].baseUrl}=w1200-h800`;
        lightbox.style.display = "flex"; 
        setTimeout(() => lightbox.style.opacity = 1, 10);
        
        document.getElementById("prev-photo").onclick = () => this.changePhoto(-1);
        document.getElementById("next-photo").onclick = () => this.changePhoto(1);
        clearInterval(this.slideshowInterval); // 停止轮播
    },

    changePhoto: function(direction) {
        this.currentPhotoIndex += direction;
        if (this.currentPhotoIndex < 0) {
            this.currentPhotoIndex = this.photos.length - 1; 
        } else if (this.currentPhotoIndex >= this.photos.length) {
            this.currentPhotoIndex = 0; 
        }
        this.showCurrentPhoto(); 
    },

    showCurrentPhoto: function() {
        const lightboxImage = document.getElementById("lightbox-image");
        lightboxImage.src = `${this.photos[this.currentPhotoIndex].baseUrl}=w1200-h800`;
    }
};

// 当 DOM 内容加载完成后，添加事件监听
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("authorize-btn").onclick = app.openOAuthPopup.bind(app);
    document.getElementById("logout-btn").onclick = app.logoutGoogle.bind(app);
    app.getAccessToken();

    // 绑定 Lightbox 点击事件关闭
    document.getElementById("lightbox").addEventListener("click", function(event) {
        if (event.target === this) {
            app.closeLightbox();
        }
    });
});
