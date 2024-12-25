import compress from 'koa-compress';
import zlib from 'zlib';

/**
 * Compression middleware configuration
 * - Compresses responses using gzip and deflate
 * - Only compresses responses larger than 2kb
 * - Compresses common text-based content types
 */
export default compress({
  threshold: 2048, // Only compress responses larger than 2kb
  gzip: {
    flush: zlib.constants.Z_SYNC_FLUSH
  },
  deflate: {
    flush: zlib.constants.Z_SYNC_FLUSH
  },
  br: false, // Disable brotli compression as it's not widely supported
  filter(contentType) {
    return /text|json|javascript|css|xml|svg/i.test(contentType);
  }
});
