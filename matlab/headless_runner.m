function headless_runner(mode, input_file, output_file, key_string)
    % HEADLESS_RUNNER Wrapper for batch processing encryption/decryption
    % Usage:
    %   headless_runner('encrypt', '/path/to/in.png', '/path/to/out.png', 'D4P5R3.99')
    %   headless_runner('decrypt', '/path/to/enc.png', '/path/to/out.png', 'D4P5R3.99')
    
    % --- Configuration (Must match original) ---
    DNA_KEYS = ['A', 'C', 'G', 'T'];
    DNA_VALS = [50, 100, 180, 230];
    CHAOS_X0 = 0.7;
    TARGET_SIZE = 480;

    % Parse Input Arguments
    if nargin < 4
        error('Usage: headless_runner(mode, input_file, output_file, key_string)');
    end
    
    % Parse Key
    % Format: D#P#R#.#
    key_match = regexp(key_string, 'D(\d+)P(\d+)R(\d+\.\d+)', 'tokens', 'once');
    if isempty(key_match)
        % Fallback for simple R input or defaults if needed, but let's enforce provided format
        % If user provides just "3.99", we might default D=4, P=5. 
        % But backend should handle this.
        fprintf('Error: Invalid key format %s. Expected D#P#R#.#\n', key_string);
        return;
    end
    D = str2double(key_match{1});
    P = str2double(key_match{2});
    r_val = str2double(key_match{3});

    fprintf('--- Starting %s ---\n', mode);
    fprintf('File: %s\n', input_file);
    fprintf('Key: D=%d, P=%d, r=%.14f\n', D, P, r_val);

    if strcmpi(mode, 'encrypt')
        t_start = tic;
        
        % Read Image
        try
            original_image = imread(input_file);
        catch ME
            fprintf('Error reading file: %s\n', ME.message);
            return;
        end

        % Preprocessing (Grayscale + Resize)
        if size(original_image, 3) == 3
            original_image = 0.2989 * double(original_image(:,:,1)) + ...
                             0.5870 * double(original_image(:,:,2)) + ...
                             0.1140 * double(original_image(:,:,3));
        end
        
        [orig_rows, orig_cols] = size(original_image);
        resized_image = zeros(TARGET_SIZE, TARGET_SIZE);
        row_scale = orig_rows / TARGET_SIZE;
        col_scale = orig_cols / TARGET_SIZE;
        for i = 1:TARGET_SIZE
            for j = 1:TARGET_SIZE
                row_idx = floor((i - 1) * row_scale) + 1;
                col_idx = floor((j - 1) * col_scale) + 1;
                resized_image(i, j) = original_image(row_idx, col_idx);
            end
        end
        I = uint8(resized_image);
        [M, N] = size(I);
        
        % Encrypt
        [C1, ~] = encrypt_core(I, D, P, r_val, M, N, DNA_KEYS, DNA_VALS, CHAOS_X0);
        encryption_time = toc(t_start);
        
        % Save
        imwrite(C1, output_file);
        fprintf('Encrypted image saved to: %s\n', output_file);
        
        % Calculate Metrics for JSON output (optional, printing for backend regex parsing)
        % 1. Entropy
        counts_enc = histcounts(C1(:), 0:256);
        probs_enc = counts_enc / sum(counts_enc);
        probs_enc(probs_enc == 0) = [];
        entropy_enc = -sum( probs_enc .* log2(probs_enc) );
        
        % 2. NPCR/UACI (Differential Test)
        P2 = I; P2(1, 1) = bitxor(P2(1, 1), 1);
        [C2, ~] = encrypt_core(P2, D, P, r_val, M, N, DNA_KEYS, DNA_VALS, CHAOS_X0);
        DC = (C1 ~= C2);
        PIXEL_COUNT_ENC = numel(C1);
        NPCR = (sum(DC(:)) / PIXEL_COUNT_ENC) * 100;
        UACI = (sum(abs(double(C1(:)) - double(C2(:)))) / (PIXEL_COUNT_ENC * 255)) * 100;

        fprintf('METRICS_START\n');
        fprintf('Time: %.4f\n', encryption_time);
        fprintf('Entropy: %.6f\n', entropy_enc);
        fprintf('NPCR: %.4f\n', NPCR);
        fprintf('UACI: %.4f\n', UACI);
        fprintf('METRICS_END\n');

    elseif strcmpi(mode, 'decrypt')
        t_start = tic;
        
        try
            encrypted_image = imread(input_file);
        catch ME
            fprintf('Error reading file: %s\n', ME.message);
            return;
        end
        
        [P_size, Q_size] = size(encrypted_image);
        M = P_size / 2;
        N = Q_size / 2;
        
        % 1. Re-generate Chaotic Map
        logistic_map = zeros(P_size*Q_size,1);
        x = CHAOS_X0;
        for skip = 1:500
            x = r_val * x * (1 - x);
        end
        for idx = 1:P_size*Q_size
            x = r_val * x * (1 - x);
            logistic_map(idx) = x;
        end
        [~, chaotic_order] = sort(logistic_map);
        
        % 2. Unscramble
        unscrambled = zeros(P_size*Q_size, 1);
        flat_encrypted = reshape(encrypted_image, [], 1);
        unscrambled(1:end) = flat_encrypted(chaotic_order);
        unscrambled_image = reshape(unscrambled, P_size, Q_size);
        
        % 3. Reverse DNA/Protein
        decrypted_image = zeros(M, N, 'uint8');
        for i = 1:M
            for j = 1:N
                mini_block = unscrambled_image((i-1)*2+1:i*2, (j-1)*2+1:j*2);
                current_data = '';
                for idx = 1:4
                    row = floor((idx-1)/2) + 1;
                    col = mod((idx-1), 2) + 1;
                    intensity = mini_block(row, col);
                    min_diff = inf;
                    closest_base = DNA_KEYS(1);
                    for m = 1:4
                        diff = abs(double(intensity) - DNA_VALS(m));
                        if diff < min_diff
                            min_diff = diff;
                            closest_base = DNA_KEYS(m);
                        end
                    end
                    current_data = [current_data, closest_base];
                end
                
                % Reverse Protein
                for round = P:-1:1
                    shift = mod(sum(double(current_data)) + round, 4);
                    current_data = circshift(current_data, -shift);
                end
                
                % Reverse DNA
                for round = D:-1:1
                    if round == 1
                        binary_str = '';
                        for k = 1:4
                            base = current_data(k);
                            switch base
                                case 'A', binary_str = [binary_str, '00'];
                                case 'C', binary_str = [binary_str, '01'];
                                case 'G', binary_str = [binary_str, '10'];
                                case 'T', binary_str = [binary_str, '11'];
                                otherwise
                                    % Silent error or handle
                                end
                            end
                            current_data = binary_str;
                        else
                            temp_str = '';
                            for k = 1:4
                                switch current_data(k)
                                    case 'A', temp_str = [temp_str, 'T'];
                                    case 'T', temp_str = [temp_str, 'A'];
                                    case 'C', temp_str = [temp_str, 'G'];
                                    case 'G', temp_str = [temp_str, 'C'];
                                end
                            end
                            current_data = temp_str;
                        end
                    end
                
                decimal_value = 0;
                for b = 1:8
                    decimal_value = decimal_value + str2double(current_data(b)) * 2^(8 - b);
                end
                decrypted_image(i, j) = uint8(max(0, decimal_value - 50)); 
            end
        end
        decryption_time = toc(t_start);
        
        imwrite(decrypted_image, output_file);
        fprintf('Decrypted image saved to: %s\n', output_file);
        fprintf('DecryptionTime: %.4f\n', decryption_time);
        
    else
        fprintf('Unknown mode: %s\n', mode);
    end
end

%% --- Utility Functions (COPIED EXACTLY) ---

function r = corrcoef_double_adj(I, mode)
    I = double(I);
    if size(I, 1) < 2 || size(I, 2) < 2
        r = NaN; return;
    end
    switch mode
        case 'h'
            A = I(:, 1:end-1);
            B = I(:, 2:end);
        case 'c'
            A = I(1:end-1, :);
            B = I(2:end, :);
        case 'v'
            A = I(1:end-1, :);
            B = I(2:end, :);
        case 'd'
            A = I(1:end-1, 1:end-1);
            B = I(2:end, 2:end);
        otherwise
            error('Unknown mode');
    end
    C = corrcoef(A(:), B(:));
    if size(C,1) < 2
        r = NaN;
    else
        r = C(1,2);
    end
end

function [NPCR_Key, UACI_Key] = key_sensitivity_test(I, D, P, r_val, M, N, DNA_KEYS, DNA_VALS, CHAOS_X0, C1)
    D_mod = D + 1;
    [C_D_mod, ~] = encrypt_core(I, D_mod, P, r_val, M, N, DNA_KEYS, DNA_VALS, CHAOS_X0);
    
    P_mod = P + 1;
    [C_P_mod, ~] = encrypt_core(I, D, P_mod, r_val, M, N, DNA_KEYS, DNA_VALS, CHAOS_X0);

    R = round(r_val * 10^14);
    R_mod = R + 1;
    r_val_mod = R_mod / 10^14;
    [C_r_mod, ~] = encrypt_core(I, D, P, r_val_mod, M, N, DNA_KEYS, DNA_VALS, CHAOS_X0);

    DC = (C1 ~= C_r_mod);
    PIXEL_COUNT = numel(C1);
    
    NPCR_Key = (sum(DC(:)) / PIXEL_COUNT) * 100;
    UACI_Key = (sum(abs(double(C1(:)) - double(C_r_mod(:)))) / (PIXEL_COUNT * 255)) * 100;
end

function [C_out, chaotic_order_out] = encrypt_core(P_in, D_in, P_inRounds, r_val_in, M_in, N_in, DNA_KEYS_in, DNA_VALS_in, CHAOS_X0_in)
    M_temp = M_in;
    N_temp = N_in;
    
    modified_values = P_in + 50;
    modified_values(modified_values > 255) = 255; 
    
    binary_representation = cell(M_temp, N_temp);
    for i_bin = 1:M_temp
        for j_bin = 1:N_temp
            binary_representation{i_bin, j_bin} = dec2bin(modified_values(i_bin, j_bin), 8);
        end
    end
    
    encrypted_image_visual_full = zeros(M_temp*2, N_temp*2);
    for i_enc = 1:M_temp
        for j_enc = 1:N_temp
            binary_str = binary_representation{i_enc, j_enc};
            current_data = binary_str;
            
            for round = 1:D_in
                if round == 1
                    encrypted_str = '';
                    for k = 1:2:8
                        bit_pair = current_data(k:k+1);
                        switch bit_pair
                            case '00', base = 'A';
                            case '01', base = 'C';
                            case '10', base = 'G';
                            case '11', base = 'T';
                        end
                        encrypted_str = [encrypted_str, base];
                    end
                    current_data = encrypted_str;
                else
                    temp_str = '';
                    for k = 1:4
                        switch current_data(k)
                            case 'A', temp_str = [temp_str, 'T'];
                            case 'T', temp_str = [temp_str, 'A'];
                            case 'C', temp_str = [temp_str, 'G'];
                            case 'G', temp_str = [temp_str, 'C'];
                        end
                    end
                    current_data = temp_str;
                end
            end
            
            for round = 1:P_inRounds
                shift = mod(sum(double(current_data)) + round, 4);
                current_data = circshift(current_data, shift);
            end
            
            encrypted_str = current_data;
            
            mini_block = zeros(2, 2);
            for idx = 1:4
                base = encrypted_str(idx);
                val = DNA_VALS_in(DNA_KEYS_in == base);
                mini_block(floor((idx-1)/2)+1, mod((idx-1),2)+1) = val;
            end
            encrypted_image_visual_full((i_enc-1)*2+1:i_enc*2, (j_enc-1)*2+1:j_enc*2) = mini_block;
        end
    end
    
    [P_size, Q_size] = size(encrypted_image_visual_full);
    logistic_map = zeros(P_size*Q_size,1);
    x = CHAOS_X0_in; 
    for skip = 1:500 
        x = r_val_in * x * (1 - x);
    end
    for idx = 1:P_size*Q_size
        x = r_val_in * x * (1 - x);
        logistic_map(idx) = x;
    end
    
    [~, chaotic_order_out] = sort(logistic_map);
    
    chaotic_scrambled = zeros(P_size, Q_size);
    flat_data = reshape(encrypted_image_visual_full, [], 1);
    
    chaotic_scrambled(chaotic_order_out) = flat_data;
    
    C_out = uint8(reshape(chaotic_scrambled, P_size, Q_size));
end
