import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Vibrant Staff App',
        short_name: 'Vibrant Staff',
        description: 'Aplikasi pengurusan staff dan projek Vibrant',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#FBF7F0', // neo-bg
        theme_color: '#000000',
        icons: [
            {
                src: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
