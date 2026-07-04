const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            searchQuery: '',
            lastQuery: '',
            searching: false,
            searched: false,
            results: [],
            stats: null,
            p2pStatus: { connectedPeers: 0, dhtNodes: 0 },
            selectedTorrent: null,
            torrentFiles: [],
            activeTab: 'top',
            topTorrents: [],
            feedTorrents: [],
            downloads: [],
            favorites: [],
            config: null,
            darkMode: true
        };
    },

    async mounted() {
        // Load theme preference
        const savedTheme = localStorage.getItem('theme');
        this.darkMode = savedTheme ? savedTheme === 'dark' : true;
        this.applyTheme();
        
        await this.loadStats();
        await this.loadP2PStatus();
        await this.loadTopTorrents();
        await this.loadFeed();
        await this.loadFavorites();
        await this.loadConfig();
        setInterval(() => {
            this.loadP2PStatus();
            if (this.activeTab === 'downloads') {
                this.loadDownloads();
            }
        }, 5000);
    },

    methods: {
        toggleTheme() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
            this.applyTheme();
        },

        applyTheme() {
            document.body.classList.toggle('light-theme', !this.darkMode);
        },

        switchTab(tab) {
            this.activeTab = tab;
            if (tab === 'top' || tab === 'feed' || tab === 'downloads' || tab === 'favorites' || tab === 'settings') {
                this.searched = false;
                this.results = [];
            }
            if (tab === 'downloads') {
                this.loadDownloads();
            }
        },

        async search() {
            if (!this.searchQuery.trim() || this.searching) return;
            
            this.searching = true;
            this.searched = true;
            this.lastQuery = this.searchQuery;
            this.results = [];
            
            try {
                const response = await fetch(`/api/search.torrents?text=${encodeURIComponent(this.searchQuery)}&limit=50`);
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.results = data.data;
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                this.searching = false;
            }
        },

        clearSearch() {
            this.searched = false;
            this.searchQuery = '';
            this.results = [];
        },

        async loadStats() {
            try {
                const response = await fetch('/api/stats.database');
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.stats = data.data;
                }
            } catch (error) {
                console.error('Stats error:', error);
            }
        },

        async loadP2PStatus() {
            try {
                const response = await fetch('/api/stats.p2pStatus');
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.p2pStatus = {
                        connectedPeers: data.data.peerCount || 0,
                        dhtNodes: data.data.dhtNodes || 0
                    };
                }
            } catch (error) {
                console.error('P2P status error:', error);
            }
        },

        async loadTopTorrents() {
            try {
                const response = await fetch('/api/search.top?limit=20');
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.topTorrents = data.data;
                }
            } catch (error) {
                console.error('Top torrents error:', error);
            }
        },

        async loadFeed() {
            try {
                const response = await fetch('/api/feed.get?index=0&limit=20');
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.feedTorrents = data.data;
                }
            } catch (error) {
                console.error('Feed error:', error);
            }
        },

        async loadDownloads() {
            try {
                const response = await fetch('/api/downloads.list');
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.downloads = data.data;
                }
            } catch (error) {
                console.error('Downloads error:', error);
            }
        },

        async loadFavorites() {
            try {
                const stored = localStorage.getItem('favorites');
                this.favorites = stored ? JSON.parse(stored) : [];
            } catch (error) {
                console.error('Favorites error:', error);
                this.favorites = [];
            }
        },

        saveFavorites() {
            localStorage.setItem('favorites', JSON.stringify(this.favorites));
        },

        isFavorite(hash) {
            return this.favorites.some(f => f.hash === hash);
        },

        toggleFavorite(torrent) {
            if (this.isFavorite(torrent.hash)) {
                this.removeFavorite(torrent.hash);
            } else {
                this.addFavorite(torrent);
            }
        },

        addFavorite(torrent) {
            if (!this.isFavorite(torrent.hash)) {
                this.favorites.push({
                    hash: torrent.hash,
                    name: torrent.name,
                    size: torrent.size,
                    seeders: torrent.seeders,
                    leechers: torrent.leechers,
                    contentType: torrent.contentType
                });
                this.saveFavorites();
            }
        },

        removeFavorite(hash) {
            this.favorites = this.favorites.filter(f => f.hash !== hash);
            this.saveFavorites();
        },

        async loadConfig() {
            try {
                const response = await fetch('/api/config.get');
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.config = data.data;
                }
            } catch (error) {
                console.error('Config error:', error);
            }
        },

        async saveSettings() {
            if (!this.config) return;
            
            try {
                const response = await fetch('/api/config.set', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.config)
                });
                const data = await response.json();
                
                if (data.success) {
                    alert('Settings saved!');
                } else {
                    alert('Failed to save settings: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Save settings error:', error);
                alert('Failed to save settings');
            }
        },

        async pauseDownload(hash) {
            try {
                await fetch(`/api/downloads.update?hash=${hash}&pause=true`);
                await this.loadDownloads();
            } catch (error) {
                console.error('Pause error:', error);
            }
        },

        async resumeDownload(hash) {
            try {
                await fetch(`/api/downloads.update?hash=${hash}&pause=false`);
                await this.loadDownloads();
            } catch (error) {
                console.error('Resume error:', error);
            }
        },

        async cancelDownload(hash) {
            if (!confirm('Cancel this download?')) return;
            
            try {
                await fetch(`/api/downloads.cancel?hash=${hash}`);
                await this.loadDownloads();
            } catch (error) {
                console.error('Cancel error:', error);
            }
        },

        async showDetails(torrent) {
            this.selectedTorrent = torrent;
            this.torrentFiles = [];
            
            try {
                const response = await fetch(`/api/search.torrent?hash=${torrent.hash}&files=true`);
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.selectedTorrent = data.data;
                    if (data.data.filesList) {
                        this.torrentFiles = data.data.filesList;
                    }
                }
            } catch (error) {
                console.error('Details error:', error);
            }
        },

        async exportTorrent(torrent) {
            if (!torrent || !torrent.hash) return;
            
            try {
                const response = await fetch(`/api/torrent.export?hash=${torrent.hash}`);
                const data = await response.json();
                
                if (data.success && data.data && data.data.path) {
                    const fileName = data.data.name || torrent.hash;
                    const downloadUrl = `/download/${torrent.hash.toLowerCase()}.torrent`;
                    
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `${fileName}.torrent`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else {
                    alert(data.error || 'Failed to export torrent');
                }
            } catch (error) {
                console.error('Export error:', error);
                alert('Failed to export torrent');
            }
        },

        formatSize(bytes) {
            if (bytes === null || bytes === undefined || bytes === 0) return '0 B';
            
            const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
            const k = 1024;
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
        },

        formatSpeed(bytesPerSec) {
            if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
            return this.formatSize(bytesPerSec) + '/s';
        },

        getMagnetLink(torrent) {
            if (!torrent || !torrent.hash) return '';
            const name = encodeURIComponent(torrent.name || '');
            return `magnet:?xt=urn:btih:${torrent.hash}&dn=${name}`;
        },

        async copyMagnetLink(torrent) {
            const link = this.getMagnetLink(torrent);
            try {
                await navigator.clipboard.writeText(link);
                alert('Magnet link copied to clipboard!');
            } catch (err) {
                const textArea = document.createElement('textarea');
                textArea.value = link;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Magnet link copied to clipboard!');
            }
        }
    }
});

app.mount('#app');
