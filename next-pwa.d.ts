declare module 'next-pwa' {
    import { NextConfig } from 'next';

    function withPWA(config: {
        dest?: string;
        disable?: boolean;
        register?: boolean;
        scope?: string;
        sw?: string;
        skipWaiting?: boolean;
        runtimeCaching?: any[];
        buildExcludes?: any[];
        cacheOnFrontEndNav?: boolean;
        reloadOnOnline?: boolean;
        subdomainPrefix?: string;
        fallbacks?: {
            image?: string;
            document?: string;
            font?: string;
            audio?: string;
            video?: string;
        };
        cacheStartUrl?: boolean;
        dynamicStartUrl?: boolean;
        dynamicStartUrlRedirect?: string;
        publicExcludes?: string[];
        [key: string]: any;
    }): (nextConfig: NextConfig) => NextConfig;

    export default withPWA;
}
