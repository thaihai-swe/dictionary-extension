<script setup lang="ts">
defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const shortcuts = [
  { key: 'Shift + Q', label: 'Quick Lookup Selected Text', sub: 'Tra cứu nhanh từ/câu đang bôi đen' },
  { key: 'Esc', label: 'Close Lookup Popup & Stop Voice', sub: 'Đóng cửa sổ & dừng phát giọng nói' },
  { key: 'Nút ⏹️ / 🔇', label: 'Global Stop Voice', sub: 'Dừng ngay âm thanh / phát âm TTS' },
  { key: 'Alt + 1', label: 'Switch to Dictionary Tab', sub: 'Chuyển sang tab Từ điển' },
  { key: 'Alt + 2', label: 'Switch to AI Assistant Tab', sub: 'Chuyển sang tab Trợ lý AI' },
  { key: 'Nút ⤢', label: 'Maximize / Restore Popup', sub: 'Phóng to / Thu nhỏ cửa sổ' },
  { key: 'Nút 🌙/☀️', label: 'Toggle Dark / Light Theme', sub: 'Đổi giao diện Sáng / Tối' },
];
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-xl border border-dark-border bg-dark-surface p-4 space-y-3.5 shadow-2xl">
      <div class="flex items-center justify-between border-b border-dark-border pb-2.5">
        <div>
          <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>⌨️</span> Shortcuts &amp; Tips
          </h3>
          <p class="text-[10px] text-slate-400">Phím tắt &amp; Hướng dẫn tiện ích</p>
        </div>
        <button @click="emit('close')" class="text-slate-400 hover:text-white text-base">✕</button>
      </div>

      <div class="space-y-1.5 text-xs max-h-[320px] overflow-y-auto pr-1">
        <div
          v-for="(item, idx) in shortcuts"
          :key="idx"
          class="flex items-center justify-between p-2 rounded-lg bg-dark-muted border border-dark-border gap-2"
        >
          <div>
            <span class="text-slate-200 font-semibold block text-[11px]">{{ item.label }}</span>
            <span class="text-slate-400 text-[10px] block">{{ item.sub }}</span>
          </div>
          <kbd class="px-2 py-0.5 rounded bg-dark-border text-brand-400 font-mono font-bold border border-slate-700 text-[10px] flex-shrink-0">
            {{ item.key }}
          </kbd>
        </div>
      </div>

      <button
        @click="emit('close')"
        class="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors"
      >
        Got it! / Đã hiểu
      </button>
    </div>
  </div>
</template>
