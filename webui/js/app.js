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
            torrentFiles: []
        };
    },

    async mounted() {
        await this.loadStats();
        await this.loadP2PStatus();
        setInterval(() => this.loadP2PStatus(), 5000);
    },

    methods: {
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

        async showDetails(torrent) {
            this.selectedTorrent = torrent;
            this.torrentFiles = [];
            
            try {
                const response = await fetch(`/api/search.torrent?hash=${torrent.hash}&includeFiles=true`);
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

        formatSize(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            const k = 1024;
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
        }
    }
});

app.mount('#app');
