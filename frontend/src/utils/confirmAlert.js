import Swal from 'sweetalert2';

export const confirmAction = async (optionsOrText) => {
    let title = "تأكيد الإجراء";
    let html = "";
    let confirmButtonText = "نعم";
    let cancelButtonText = "إلغاء";
    let confirmButtonClass = "btn btn-outline-danger mx-1 px-3 py-1";
    let cancelButtonClass = "btn btn-outline-secondary mx-1 px-3 py-1";
    let onConfirm = null;

    if (typeof optionsOrText === 'string') {
        title = optionsOrText;
    } else if (optionsOrText && typeof optionsOrText === 'object') {
        title = optionsOrText.title || "تأكيد الإجراء";
        html = optionsOrText.message || optionsOrText.html || optionsOrText.text || "";
        confirmButtonText = optionsOrText.confirmButtonText || "نعم";
        cancelButtonText = optionsOrText.cancelButtonText || "إلغاء";
        if (optionsOrText.confirmButtonClass) {
            confirmButtonClass = optionsOrText.confirmButtonClass;
        }
        if (optionsOrText.cancelButtonClass) {
            cancelButtonClass = optionsOrText.cancelButtonClass;
        }
        onConfirm = optionsOrText.onConfirm;
    }

    const result = await Swal.fire({
        title: title,
        html: html || undefined,
        icon: "warning",
        width: '400px',
        padding: '1.25rem 1.5rem',
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        cancelButtonText: cancelButtonText,
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            popup: 'swal-custom-popup',
            icon: 'swal-custom-icon',
            title: 'swal-custom-title',
            htmlContainer: 'swal-custom-html',
            actions: 'swal-custom-actions',
            confirmButton: confirmButtonClass,
            cancelButton: cancelButtonClass
        }
    });

    if (result.isConfirmed) {
        if (typeof onConfirm === 'function') {
            await onConfirm();
        }
        return true;
    }
    return false;
};

