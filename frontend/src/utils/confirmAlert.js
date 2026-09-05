import Swal from 'sweetalert2';

export const confirmAction = async (text) => {
    const result = await Swal.fire({
        title: text,
        icon: "warning",
        width: '600px',
        showCancelButton: true,
        confirmButtonText: "نعم",
        cancelButtonText: "إلغاء",
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            title: 'fs-4 fw-normal text-success',
            confirmButton: 'btn btn-outline-danger mx-2 px-4',
            cancelButton: 'btn btn-outline-primary mx-2 px-4'
        }
    });
    return result.isConfirmed;
};
