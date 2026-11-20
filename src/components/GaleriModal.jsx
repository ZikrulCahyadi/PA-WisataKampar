import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function GaleriModal({ isOpen, onClose, wisataId, wisataName }) {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  useEffect(() => {
    if (isOpen && wisataId) {
      fetchPhotos();
    }
  }, [isOpen, wisataId]);

  const fetchPhotos = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('galeri_wisata')
        .select('*')
        .eq('id_wisata', wisataId);

      if (err) throw err;
      setPhotos(data || []);
    } catch (err) {
      setError('Gagal memuat galeri wisata: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setError('');

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('Foto')
          .upload(`galeri/${fileName}`, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('Foto')
          .getPublicUrl(`galeri/${fileName}`);

        // Save to database
        const { error: dbError } = await supabase
          .from('galeri_wisata')
          .insert([{ id_wisata: wisataId, url_gambar: publicUrl }]);

        if (dbError) throw dbError;
      }

      showToast(`${files.length} foto berhasil ditambahkan ke galeri`, 'success');
      await fetchPhotos();
    } catch (err) {
      setError('Gagal mengunggah gambar: ' + err.message);
      showToast('Gagal mengunggah gambar: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (id_galeri) => {
    setDeleteConfirm({ isOpen: true, id: id_galeri });
  };

  const confirmDeletePhoto = async () => {
    const { id } = deleteConfirm;
    if (!id) return;

    try {
      const { error: err } = await supabase
        .from('galeri_wisata')
        .delete()
        .eq('id', id);

      if (err) throw err;
      showToast('Foto berhasil dihapus dari galeri', 'success');
      fetchPhotos();
    } catch (err) {
      setError('Gagal menghapus gambar: ' + err.message);
      showToast('Gagal menghapus gambar: ' + err.message, 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/80">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Galeri Foto Wisata</h2>
            <p className="text-xs text-slate-500 mt-0.5">{wisataName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Upload Area */}
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 transition-colors">
              <div className="flex flex-col items-center justify-center py-4">
                <Upload className="w-6 h-6 mb-2 text-slate-400" />
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-blue-600">Pilih foto</span> atau seret file ke sini
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Dapat memilih lebih dari 1 foto sekaligus</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            {uploading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600 font-semibold bg-blue-50 py-2.5 rounded-xl border border-blue-200">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                Sedang mengunggah foto ke penyimpanan...
              </div>
            )}
          </div>

          {/* Gallery Grid */}
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Memuat galeri foto...</div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center border border-slate-100 rounded-2xl bg-slate-50/50">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-xs flex items-center justify-center mb-3 text-slate-400 border border-slate-200/80">
                <ImageIcon className="w-7 h-7" />
              </div>
              <p className="text-slate-700 font-bold text-sm mb-0.5">Belum ada foto tambahan</p>
              <p className="text-slate-400 text-xs">Unggah foto dokumentasi untuk destinasi wisata ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                  <img 
                    src={photo.url_gambar} 
                    alt="Galeri Wisata" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <button 
                      onClick={() => handleDeleteClick(photo.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-transform scale-90 group-hover:scale-100"
                      title="Hapus foto ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeletePhoto}
        title="Hapus foto dari galeri?"
        description="Foto ini akan dihapus dari dokumentasi galeri wisata."
        confirmText="Hapus"
      />
    </div>
  );
}
