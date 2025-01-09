import compress from 'koa-compress';
import zlib from 'zlib';

/**
 * Compression middleware configuration
 * - Compresses responses using gzip and deflate
 * - Only compresses responses larger than 2kb
 * - Compresses common text-based content types
 * - Only compresses when client accepts compression
 */
export default compress({
  // 设置压缩阈值为2kb
  threshold: 2048,
  
  // 只压缩特定的内容类型
  filter(contentType) {
    return /text|json|javascript|css|xml|svg/i.test(contentType);
  },
  
  // 配置压缩选项
  gzip: {
    flush: zlib.constants.Z_SYNC_FLUSH
  },
  deflate: {
    flush: zlib.constants.Z_SYNC_FLUSH
  },
  
  // 禁用brotli压缩（因为支持不够广泛）
  br: false,
  
  // 设置默认编码为identity，这样在没有Accept-Encoding头时不会压缩
  defaultEncoding: 'identity'
});
