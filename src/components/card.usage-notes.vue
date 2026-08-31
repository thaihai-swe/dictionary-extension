<script setup lang="ts">
import { computed } from 'vue';
import { ConfusablePair } from '../types';

const props = defineProps<{
  notes?: string;
  warnings?: string[];
  pairs?: ConfusablePair[];
}>();

const warningItems = computed(() => {
  if (props.warnings?.length) return props.warnings.filter((item) => item.trim());
  return props.notes?.trim() ? [props.notes.trim()] : [];
});

const hasData = computed(() => Boolean(warningItems.value.length || props.pairs?.length));
</script>

<template>
  <div v-if="hasData" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
    <div class="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
      <span>⚠️</span>
      <span>USAGE &amp; REGISTER NOTES</span>
    </div>
    <ul v-if="warningItems.length || pairs?.length" class="space-y-1 text-xs text-slate-200">
      <li v-for="warning in warningItems" :key="warning">{{ warning }}</li>
      <li v-for="pair in pairs" :key="pair.word">
        <strong>Confused with <em>{{ pair.word }}</em>:</strong> {{ pair.distinction }}
      </li>
    </ul>
  </div>
</template>
