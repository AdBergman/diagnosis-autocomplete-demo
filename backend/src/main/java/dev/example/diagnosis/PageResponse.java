package dev.example.diagnosis;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {

    public PageResponse {
        items = List.copyOf(items);
    }

    static <T> PageResponse<T> slice(List<T> results, int page, int size) {
        var totalElements = results.size();
        var totalPages = totalElements == 0 ? 0 : (totalElements + size - 1) / size;
        var firstIndex = (long) page * size;

        if (firstIndex >= totalElements) {
            return new PageResponse<>(List.of(), page, size, totalElements, totalPages, false);
        }

        var fromIndex = Math.toIntExact(firstIndex);
        var toIndex = Math.min(fromIndex + size, totalElements);
        return new PageResponse<>(
                results.subList(fromIndex, toIndex),
                page,
                size,
                totalElements,
                totalPages,
                page + 1 < totalPages
        );
    }
}
