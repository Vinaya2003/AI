const CACHE_NAME = 'vision-voice-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/public/css/style.css',
    '/public/js/script.js',
    '/public/js/gestures.js',
    '/public/js/speechSynthesis.js',
    '/public/js/speechRecognition.js',
    '/public/js/imageRecognition.js',
    '/public/images/hand.svg',
    '/public/images/swipe-horizontal.svg',
    '/public/images/swipe-vertical.svg',
    '/public/images/icon.svg',
    '/public/images/camera-icon.svg',
    '/public/images/hand-sign-icon.svg',
    '/public/sounds/notification.mp3',
    '/public/sounds/camera-shutter.mp3',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    response => {
                        // Check if we received a valid response
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
}); 