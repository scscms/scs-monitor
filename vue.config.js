module.exports = {
  baseUrl: '/',
  outputDir: 'dist',
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true
      }
    }
  }
}
