// Purpose: Store client-side nho gon cho state dung chung giua component.
import { create } from 'zustand';

const useModalStore = create((set) => ({
  isOpen: false,
  props: {
    title: '',
    content: null,
    onConfirm: null,
    onCancel: null,
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    type: 'info', // 'success', 'warning', 'error', 'info', 'custom'
    showCancel: true,
    customActions: null, // Cho phép custom hoàn toàn các nút bấm
    width: '520px', // Độ rộng linh hoạt
    hideCloseButton: false, // Ẩn hiện nút X
  },
  openModal: (options) =>
    set(() => ({
      isOpen: true,
      props: {
        // Default props
        title: '',
        content: null,
        onConfirm: null,
        onCancel: null,
        confirmText: 'Xác nhận',
        cancelText: 'Hủy',
        type: 'info',
        showCancel: true,
        customActions: null,
        width: '520px',
        hideCloseButton: false,
        // Override with provided options
        ...options,
      },
    })),
  closeModal: () => set({ isOpen: false }),
}));

export default useModalStore;
