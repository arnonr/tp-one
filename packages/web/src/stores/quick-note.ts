import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { quickNoteService, type QuickNote, type CreateNoteParams } from "@/services/quick-note";

export const useQuickNoteStore = defineStore("quick-note", () => {
  const notes = ref<QuickNote[]>([]);
  const archivedNotes = ref<QuickNote[]>([]);
  const isLoading = ref(false);
  const isPanelOpen = ref(false);
  const showArchived = ref(false);

  const pinnedNotes = computed(() => notes.value.filter((n) => n.isPinned));
  const unpinnedNotes = computed(() => notes.value.filter((n) => !n.isPinned));

  async function fetchNotes() {
    isLoading.value = true;
    try {
      notes.value = await quickNoteService.getNotes();
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchArchivedNotes() {
    isLoading.value = true;
    try {
      archivedNotes.value = await quickNoteService.getArchivedNotes();
    } finally {
      isLoading.value = false;
    }
  }

  async function addNote(params: CreateNoteParams) {
    const note = await quickNoteService.createNote(params);
    notes.value.unshift(note);
    return note;
  }

  async function updateNote(id: string, params: Parameters<typeof quickNoteService.updateNote>[1]) {
    const updated = await quickNoteService.updateNote(id, params);
    const idx = notes.value.findIndex((n) => n.id === id);
    if (idx !== -1) {
      notes.value[idx] = updated;
    }
    return updated;
  }

  async function deleteNote(id: string) {
    await quickNoteService.deleteNote(id);
    notes.value = notes.value.filter((n) => n.id !== id);
    archivedNotes.value = archivedNotes.value.filter((n) => n.id !== id);
  }

  async function togglePin(id: string) {
    const updated = await quickNoteService.togglePin(id);
    const idx = notes.value.findIndex((n) => n.id === id);
    if (idx !== -1) {
      notes.value[idx] = updated;
    }
    return updated;
  }

  async function archiveNote(id: string) {
    await quickNoteService.archiveNote(id);
    const idx = notes.value.findIndex((n) => n.id === id);
    if (idx !== -1) {
      const [note] = notes.value.splice(idx, 1);
      archivedNotes.value.unshift({ ...note, isArchived: true });
    }
  }

  async function unarchiveNote(id: string) {
    await quickNoteService.unarchiveNote(id);
    const idx = archivedNotes.value.findIndex((n) => n.id === id);
    if (idx !== -1) {
      const [note] = archivedNotes.value.splice(idx, 1);
      notes.value.unshift({ ...note, isArchived: false });
    }
  }

  function openPanel() {
    isPanelOpen.value = true;
    if (notes.value.length === 0) {
      fetchNotes();
    }
  }

  function closePanel() {
    isPanelOpen.value = false;
  }

  function togglePanel() {
    if (isPanelOpen.value) {
      closePanel();
    } else {
      openPanel();
    }
  }

  return {
    notes,
    archivedNotes,
    isLoading,
    isPanelOpen,
    showArchived,
    pinnedNotes,
    unpinnedNotes,
    fetchNotes,
    fetchArchivedNotes,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    archiveNote,
    unarchiveNote,
    openPanel,
    closePanel,
    togglePanel,
  };
});