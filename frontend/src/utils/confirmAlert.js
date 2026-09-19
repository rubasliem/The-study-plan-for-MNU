import Swal from 'sweetalert2';

export const confirmAction = async (optionsOrText) => {
    let title = "تأكيد الإجراء";
    let html = "";
    let confirmButtonText = "نعم";
    let cancelButtonText = "إلغاء";
    let confirmButtonClass = "btn btn-outline-danger mx-2 px-4 fw-semibold";
    let cancelButtonClass = "btn btn-outline-secondary mx-2 px-4 fw-semibold";
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
        width: '560px',
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        cancelButtonText: cancelButtonText,
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            title: 'fs-5 fw-bold text-dark mb-2',
            htmlContainer: 'fs-6 text-muted mb-3',
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

